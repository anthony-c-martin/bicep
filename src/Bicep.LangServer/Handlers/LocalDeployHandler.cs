// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Collections.Immutable;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Azure.Bicep.LocalDeploy;
using Azure.Bicep.LocalDeploy.Extensibility;
using Azure.Deployments.Core.Definitions;
using Azure.Deployments.Core.ErrorResponses;
using Bicep.Core.Emit;
using Bicep.Core.Semantics.Namespaces;
using Bicep.LanguageServer.CompilationManager;
using MediatR;
using Microsoft.WindowsAzure.ResourceStack.Common.Json;
using Newtonsoft.Json.Linq;
using OmniSharp.Extensions.JsonRpc;
using OmniSharp.Extensions.LanguageServer.Protocol.Models;

namespace Bicep.LanguageServer.Handlers;

[Method("bicep/localDeploy", Direction.ClientToServer)]
public record LocalDeployRequest(TextDocumentIdentifier TextDocument)
    : ITextDocumentIdentifierParams, IRequest<LocalDeployResponse>;

public record LocalDeploymentContent(
    string ProvisioningState,
    ImmutableDictionary<string, JToken> Outputs,
    LocalDeploymentOperationError? Error);

public record LocalDeploymentOperationError(
    string Code,
    string Message,
    string Target);

public record LocalDeploymentOperationContent(
    string ResourceName,
    string ProvisioningState,
    LocalDeploymentOperationError? Error);

public record LocalDeployResponse(
    LocalDeploymentContent Deployment,
    ImmutableArray<LocalDeploymentOperationContent> Operations);

public class LocalDeployHandler : IJsonRpcRequestHandler<LocalDeployRequest, LocalDeployResponse>
{
    private readonly ICompilationManager compilationManager;

    public LocalDeployHandler(ICompilationManager compilationManager)
    {
        this.compilationManager = compilationManager;
    }

    public async Task<LocalDeployResponse> Handle(LocalDeployRequest request, CancellationToken cancellationToken)
    {
        if (this.compilationManager.GetCompilation(request.TextDocument.Uri) is not { } context)
        {
            throw new InvalidOperationException("Failed to find active compilation.");
        }

        var paramsModel = context.Compilation.GetEntrypointSemanticModel();
        //Failure scenario is ignored since a diagnostic for it would be emitted during semantic analysis
        if (paramsModel.HasErrors() ||
            !paramsModel.Root.TryGetBicepFileSemanticModelViaUsing().IsSuccess(out var usingModel))
        {
            throw new InvalidOperationException("Bicep file had errors.");
        }

        using var paramsWriter = new StringWriter();
        new ParametersEmitter(paramsModel).Emit(paramsWriter);
        var parametersString = paramsWriter.ToString();

        using var templateWriter = new StringWriter();
        new TemplateEmitter(paramsModel.Compilation, usingModel).Emit(templateWriter);
        var templateString = templateWriter.ToString();

        var extensibilityHandler = new LocalExtensibilityHandler();
        extensibilityHandler.Register("LocalNested", "0.0.0", () => new AzExtensibilityProvider(extensibilityHandler));
        extensibilityHandler.Register(UtilsNamespaceType.Settings.ArmTemplateProviderName, UtilsNamespaceType.Settings.ArmTemplateProviderVersion, () => new UtilsExtensibilityProvider());
        extensibilityHandler.Register(K8sNamespaceType.Settings.ArmTemplateProviderName, K8sNamespaceType.Settings.ArmTemplateProviderVersion, () => new K8sExtensibilityProvider());
        extensibilityHandler.Register(GithubNamespaceType.Settings.ArmTemplateProviderName, GithubNamespaceType.Settings.ArmTemplateProviderVersion, () => new GithubExtensibilityProvider());

        var result = await LocalDeployment.Deploy(extensibilityHandler, templateString, parametersString, cancellationToken);

        return FromResult(result);
    }

    private static LocalDeploymentOperationContent FromOperation(DeploymentOperationDefinition operation)
    {
        var result = operation.Properties.StatusMessage.TryFromJToken<OperationResult>();
        var error = result?.Error?.Message.TryFromJson<ErrorResponseMessage>()?.Error;
        var operationError = error is {} ? new LocalDeploymentOperationError(error.Code, error.Message, error.Target) : null;

        return new LocalDeploymentOperationContent(
            operation.Properties.TargetResource.SymbolicName,
            operation.Properties.ProvisioningState.ToString(),
            operationError);
    }

    private static LocalDeployResponse FromResult(LocalDeployment.Result result)
    {
        var deployError = result.Deployment.Properties.Error is {} error ?
            new LocalDeploymentOperationError(error.Code, error.Message, error.Target) : null;


        LocalDeploymentContent deployment = new(
            result.Deployment.Properties.ProvisioningState.ToString() ?? "Failed",
            result.Deployment.Properties.Outputs?.ToImmutableDictionary(x => x.Key, x => x.Value.Value) ?? ImmutableDictionary<string, JToken>.Empty,
            deployError);

        var operations = result.Operations.Select(FromOperation).ToImmutableArray();

        return new(deployment, operations);
    }
}
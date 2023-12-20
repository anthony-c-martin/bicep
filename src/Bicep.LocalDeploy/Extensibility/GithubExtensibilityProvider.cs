// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Azure.Deployments.Extensibility.Contract;
using Azure.Deployments.Extensibility.Core.Json;
using Azure.Deployments.Extensibility.Messages;
using Microsoft.WindowsAzure.ResourceStack.Common.Json;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Octokit;
using Octokit.Internal;

namespace Azure.Bicep.LocalDeploy.Extensibility;

public partial class GithubExtensibilityProvider : IExtensibilityProvider
{
    public Task<ExtensibilityOperationResponse> Delete(ExtensibilityOperationRequest request, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }

    public async Task<ExtensibilityOperationResponse> Get(ExtensibilityOperationRequest request, CancellationToken cancellationToken)
    {
        var credentials = new Credentials(request.Import.Config["token"]!.ToString());
        var github = new GitHubClient(new ProductHeaderValue("Bicep.LocalDeploy"), new InMemoryCredentialStore(credentials));

        switch (request.Resource.Type)
        {
            case "Repository": {
                var owner = request.Resource.Properties["owner"]!.ToString();
                var name = request.Resource.Properties["name"]!.ToString();
                try {
                    var response = await github.Connection.Get<object>(ApiUrls.Repository(owner, name), null);
                    var body = response.Body.ToString().FromJson<JToken>();
                    
                    return new ExtensibilityOperationResponse(
                        new(request.Resource.Type, body),
                        null,
                        null);
                } catch (Exception exception) {
                    return new ExtensibilityOperationResponse(
                        null,
                        null,
                        new Deployments.Extensibility.Data.ExtensibilityError[] {
                            new("Repository", exception.Message, $"{owner}/{name}"),
                        });
                }
            }
        }

        throw new NotImplementedException();
    }

    public Task<ExtensibilityOperationResponse> PreviewSave(ExtensibilityOperationRequest request, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }

    public Task<ExtensibilityOperationResponse> Save(ExtensibilityOperationRequest request, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }
}
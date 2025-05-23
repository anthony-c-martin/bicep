// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Azure.Deployments.Expression.Configuration;
using Azure.Deployments.Expression.Engines;
using Azure.Deployments.Expression.Expressions;
using Microsoft.WindowsAzure.ResourceStack.Common.Utilities;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Bicep.Decompiler.ArmHelpers
{
    public static class JTokenHelpers
    {
        public static T LoadJson<T>(string jsonInput, Func<JsonReader, JsonLoadSettings, T> loadFunc, bool ignoreTrailingContent) where T : JToken
        {
            T jToken;
            using (var reader = new JsonTextReader(new StringReader(jsonInput)))
            {
                reader.DateParseHandling = DateParseHandling.None;

                jToken = loadFunc(reader, new JsonLoadSettings
                {
                    CommentHandling = CommentHandling.Ignore,
                    LineInfoHandling = LineInfoHandling.Load,
                });

                if (!ignoreTrailingContent)
                {
                    // Force an exception if there's additional input past the object/value that's been read
                    reader.Read();
                }
            }
            return jToken;
        }

        public static void VisitExpressions<TToken>(TToken input, Action<LanguageExpression> visitFunc)
            where TToken : JToken
        {
            var visitor = new LanguageExpressionDelegatedVisitor
            {
                OnFunctionExpression = visitFunc,
                OnJTokenExpression = visitFunc,
            };

            void VisitLanguageExpressions(string value)
            {
                if (ExpressionsEngine.IsLanguageExpression(value))
                {
                    var expression = ExpressionsEngine.ParseLanguageExpression(value);
                    expression.Accept(visitor);
                }
            }

            if (input is JValue jValue && jValue.ToObject<string>() is { } value)
            {
                VisitLanguageExpressions(value);
                return;
            }

            JsonUtility.WalkJsonRecursive(
                input,
                objectAction: @object =>
                {
                    foreach (var property in @object.Properties())
                    {
                        VisitLanguageExpressions(property.Name);
                    }
                },
                tokenAction: token =>
                {
                    if (token.Type == JTokenType.String && token.ToObject<string>() is { } value)
                    {
                        VisitLanguageExpressions(value);
                    }
                });
        }

        public static TToken RewriteExpressions<TToken>(TToken input, Func<LanguageExpression, LanguageExpression> rewriteFunc)
            where TToken : JToken
        {
            if (input.DeepClone() is not TToken clonedInput)
            {
                throw new InvalidOperationException($"Failed to clone input");
            }

            input = clonedInput;

            string RewriteLanguageExpression(string value)
            {
                if (ExpressionsEngine.IsLanguageExpression(value))
                {
                    var expression = ExpressionsEngine.ParseLanguageExpression(value);

                    var rewritten = LanguageExpressionRewriter.Rewrite(expression, rewriteFunc);

                    if (!object.ReferenceEquals(expression, rewritten))
                    {
                        return ExpressionsEngine.SerializeExpression(rewritten, new ExpressionSerializerSettings { IncludeOuterSquareBrackets = true });
                    }
                }

                return value;
            }

            if (input is JValue jValue && jValue.ToObject<string>() is { } value)
            {
                var expression = RewriteLanguageExpression(value);

                return (new JValue(expression) as TToken)!;
            }

            JsonUtility.WalkJsonRecursive(
                input,
                objectAction: @object =>
                {
                    // force enumeration with .ToArray() - to avoid modifying a collection while iterating
                    foreach (var property in @object.Properties().ToArray())
                    {
                        var newName = RewriteLanguageExpression(property.Name);
                        if (newName != property.Name)
                        {
                            property.AddBeforeSelf(new JProperty(newName, property.Value));
                            property.Remove();
                        }
                    }
                },
                propertyAction: property =>
                {
                    if (property.Value is null)
                    {
                        return;
                    }

                    if (property.Value.Type == JTokenType.String && property.Value.ToObject<string>() is string value)
                    {
                        var newValue = RewriteLanguageExpression(value);
                        if (newValue != value)
                        {
                            property.Value.Replace(newValue);
                        }
                    }
                    else if (property.Value.Type == JTokenType.Array)
                    {
                        // force enumeration with .ToArray() - to avoid modifying a collection while iterating
                        foreach (var child in property.Value.Children().ToArray())
                        {
                            if (child.Type == JTokenType.String && child.ToObject<string>() is string childValue)
                            {
                                var newValue = RewriteLanguageExpression(childValue);
                                if (newValue != childValue)
                                {
                                    child.Replace(newValue);
                                }
                            }
                        }
                    }
                });

            return input;
        }
    }
}

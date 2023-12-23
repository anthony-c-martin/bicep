# Local-only Bicep
This document explains how to set up the experimental local-only deployment support for 3rd party extensibility providers, without a dependency on Azure.

## Installing
### Pre-Requisites
* Copy the full [Samples](../src/Bicep.LocalDeploy/samples) folder locally. You can use [this tool](https://download-directory.github.io/?url=https%3A%2F%2Fgithub.com%2Fanthony-c-martin%2Fbicep%2Ftree%2Fmain%2Fsrc%2FBicep.LocalDeploy%2Fsamples) to download it as a zip file.
* For testing with the Kubernetes provider, you will need access to a cluster configured in your kubeconfig file. If you have Docker installed, this can be obtained by [Enabling Kubernetes Support](https://docs.docker.com/desktop/kubernetes/).
* To use the Deploy Pane:
    * Configure experimental feature "localDeploy" in your `bicepconfig.json` file.
    * You must launch it for the `.bicepparam` file (launching for the `.bicep` file is currently not supported).

### Mac/Linux
```sh
# install the CLI to ~/.azure/bin/bicep
bash <(curl -Ls https://aka.ms/bicep/nightly-cli.sh) --repo anthony-c-martin/bicep
# install the VSCode Extension
bash <(curl -Ls https://aka.ms/bicep/nightly-vsix.sh) --repo anthony-c-martin/bicep
```

### Windows
```sh
# install the CLI to ~/.azure/bin/bicep
iex "& { $(irm https://aka.ms/bicep/nightly-cli.ps1) } -Repo anthony-c-martin/bicep"
# install the VSCode Extension
iex "& { $(irm https://aka.ms/bicep/nightly-vsix.ps1) } -Repo anthony-c-martin/bicep"
```

## Samples
### Kubernetes
#### Voting App
Param file: `samples/kubernetes/voting-app.bicepparam`

This will run the [Voting App Sample](https://github.com/Azure-Samples/azure-voting-app-redis) locally.

After deploying, test it out by navigating to [http://localhost](http://localhost) in a browser.

Cleanup:
```sh
kubectl delete deployment azure-vote-back
kubectl delete deployment azure-vote-front
kubectl delete service azure-vote-back
kubectl delete service azure-vote-front
```

#### Bicep Compilation Service
Param file: `samples/kubernetes/echo-server.bicepparam`

This will run the [echo-server](https://ealenn.github.io/Echo-Server/) service locally.

Test it out by submitting a request:
```sh
curl -I localhost:8080
```

Cleanup:
```sh
kubectl delete deployment echo-server 
kubectl delete service echo-server
```

### "Wait" functionality
```sh
bicep local-deploy samples/utils/wait.bicepparam
```

### "Assert" functionality
```sh
bicep local-deploy samples/utils/assert.bicepparam
```

## Caveats
* Only extensible resources are supported - there is no support for Az.
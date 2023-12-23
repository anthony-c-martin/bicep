provider 'utils@0.0.1'

resource getKubeConfig 'BashScript' = {
  script: 'cat ~/.kube/config'
}

module k8s '../kubernetes/echo-server.bicep' = {
  name: 'echo-server'
  params: {
    kubeConfig: base64(getKubeConfig.stdout)
  }
}

provider 'utils@0.0.1'

resource getKubeConfig 'BashScript' = {
  script: 'cat ~/.kube/config'
}

module k8s './voting-app.bicep' = {
  name: 'voting-app'
  params: {
    kubeConfig: base64(getKubeConfig.stdout)
  }
}

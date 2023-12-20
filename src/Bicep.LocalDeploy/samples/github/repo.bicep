@secure()
param githubToken string

provider 'github@0.0.1' with {
  token: githubToken
}

resource repo 'Repository' existing = {
  owner: 'Azure'
  name: 'bicep'
}

output repo object = repo

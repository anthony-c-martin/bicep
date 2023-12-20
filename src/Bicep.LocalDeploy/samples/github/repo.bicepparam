using 'repo.bicep'

// TODO: Fix the below by saving your GH access token:
//         gh auth token > ../secrets/githubtoken"
param githubToken = trim(loadTextContent('../secrets/githubtoken'))

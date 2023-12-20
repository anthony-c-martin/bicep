provider 'utils@0.0.1'

param name string

resource sayHelloWithBash 'BashScript' = {
  script: replace(loadTextContent('./script.sh'), '$INPUT_NAME', name)
}

output stdout string = sayHelloWithBash.stdout

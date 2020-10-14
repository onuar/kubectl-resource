# kubectl-resource
Useful for overall cluster resources (cpu and mem limit). It works on ```kubectl current context```. So you should be sure that you are working on right context.

## Prerequisites
* Kubectl
* Jq (Jid for debugging and finding Jq pattern out)

## Install
`npm i`

## Run
```npm run start -- --namespace=my-team --clusterCount=3```
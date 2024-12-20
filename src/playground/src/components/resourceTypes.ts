// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { BicepType, readTypesJson, ResourceFlags, ResourceType, TypeReference } from 'bicep-types'
import './creator.css';

export type typeResolver = (typeReference: TypeReference) => BicepType;
export interface ResourceTypeLoader {
  resourceType: ResourceType;
  getType: (typeReference: TypeReference) => BicepType;
}

export const loadResourceTypes = () => {
  const resourceTypes: ResourceTypeLoader[] = [];
  const jsonFiles = [
    /* eslint-disable @typescript-eslint/no-require-imports */
    require('../types/compute.json?raw'),
    require('../types/cosmosdb.json?raw'),
    require('../types/network.json?raw'),
    require('../types/keyvault.json?raw'),
    require('../types/storage.json?raw'),
    require('../types/web.json?raw'),
    /* eslint-enable @typescript-eslint/no-require-imports */
  ];
  
  for (const jsonFile of jsonFiles) {
    const types = readTypesJson(jsonFile);
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      if (type.type !== 'ResourceType') { 
        continue;
      }

      if (type.name.split('/').length > 2) {
        // Let's just do top-level types for now
        continue;
      }

      if ((type.flags & ResourceFlags.ReadOnly) === ResourceFlags.ReadOnly) {
        // Only writable resource types
        continue;
      }

      resourceTypes.push({
        resourceType: type,
        getType: ref => types[ref.index],
      });
    }
  }

  return resourceTypes;
}
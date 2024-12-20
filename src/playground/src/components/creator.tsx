// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import React, { useEffect, useState } from 'react';
import { Form, Nav, Navbar } from 'react-bootstrap';
import { BicepCode, getBicepResource } from './bicepCode';
import { GeneralInput } from './inputs';
import './creator.css';
import { InputCard } from './inputCard';
import { handleShareLink, getShareLink } from '../utils';
import { CopyButton } from './copyButton';
import { loadResourceTypes, ResourceTypeLoader } from './resourceTypes';

export const Creator: React.FC = () => {
  const [body, setBody] = useState<Record<string, unknown>>();
  const [resourceType, setResourceType] = useState<string>();
  const [resourceTypeLoaders, setResourceTypeLoaders] = useState<Record<string, ResourceTypeLoader>>({});
  useEffect(() => {
    setResourceTypeLoaders(Object.fromEntries(loadResourceTypes().map(x => [x.resourceType.name, x])));
  }, []);

  const onResourceTypeSelect = (value: string) => {
    setResourceType(value);
    setBody(undefined);
  }

  const setContentFromJson = (content?: string) => {
    if (content) {
      const parsed = JSON.parse(content);
      setResourceType(parsed.resourceType);
      setBody(parsed.body);
    }
  }

  const getContentAsJson = () => {
    return JSON.stringify({
      body,
      resourceType
    });
  }
  
  useEffect(() => {
    window.addEventListener('hashchange', () => handleShareLink(setContentFromJson));
    handleShareLink(setContentFromJson);
  }, []);

  const typeLoader = resourceType ? resourceTypeLoaders[resourceType] : undefined;

  return <>
    <Navbar bg="dark" variant="dark">
      <Navbar.Brand>Bicep Creator</Navbar.Brand>
      <Nav className="ms-auto">
        {resourceType && <>
        <CopyButton
          title="Copy Link"
          description="Copy a shareable link to clipboard"
          getContent={() => getShareLink(getContentAsJson())}/>
        <CopyButton
          title="Copy Code"
          description="Copy the Bicep code to clipboard"
          getContent={() => getBicepResource(resourceType, body)}/>
        </>}
      </Nav>
    </Navbar>
    <div className="creator-container">
      <div className="creator-pane">
        <InputCard title="Pick a resource type" description="This is a hand-picked subset of resource types to demonstrate the proof-of-concept.">
          <Form.Select value={resourceType} onChange={e => onResourceTypeSelect(e.target.value)}>
            {!resourceType && <option value=""></option>}
            {Object.keys(resourceTypeLoaders).map(resourceType => <option>{resourceType}</option>)}
          </Form.Select>
        </InputCard>
        {typeLoader &&
          <GeneralInput
            resolveType={typeLoader.getType}
            required={true}
            typeChain={[]}
            type={typeLoader.getType(typeLoader.resourceType.body)}
            value={body}
            onUpdate={setBody} />}
      </div>
      <div className="creator-pane">
        {resourceType &&
          <BicepCode code={getBicepResource(resourceType, body)} />}
      </div>
    </div>
  </>
};
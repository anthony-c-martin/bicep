// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as monaco from 'monaco-editor';
import React, { createRef, useEffect, useState } from "react";

function getIndent(indent: number) {
  return '  '.repeat(indent);
}

function isBicepIdentifier(value: string) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
}

function getBicepKey(key: string) {
  return isBicepIdentifier(key) ? key : getBicepString(key);
}

function getBicepString(value: string) {
  const escaped = value
    .replace(/\\/g, "\\\\") // must do this first!
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\${/g, "\\${")
    .replace(/'/g, "\\'");
  return `'${escaped}'`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBicep(value: any, indent: number) {
  if (value === undefined || value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return getBicepString(value);
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (Array.isArray(value)) {
    let result = `[`;
    for (const item of value) {
      result += `\n${getIndent(indent + 1)}${getBicep(item, indent + 1)}`;
    }
    result += `\n${getIndent(indent)}]`;

    return result;
  }

  if (typeof value === 'object') {
    let result = `{`;
    for (const key in value) {
      result += `\n${getIndent(indent + 1)}${getBicepKey(key)}: ${getBicep(value[key], indent + 1)}`;
    }
    result += `\n${getIndent(indent)}}`;

    return result;
  }

  throw new Error(`Unsupported type: ${typeof value}`);
}

export function getBicepResource(resourceType: string, body?: Record<string, unknown>) {
  let result = `resource myResource '${resourceType}' = {\n`;
  if (resourceType.split('/').length > 2) {
    result += `  parent: parentResource\n`;
  }

  for (const [propName, propValue] of Object.entries(body ?? {})) {
    result += `  ${getBicepKey(propName)}: ${getBicep(propValue, 1)}\n`;
  }

  result += `}`;

  return result;
}

const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  language: 'bicep',
  theme: 'vs-dark',
  scrollBeyondLastLine: false,
  automaticLayout: true,
  minimap: {
    enabled: false,
  },
  readOnly: true,
};

export const BicepCode: React.FC<{
  code: string
}> = ({ code }) => {
  const editorRef = createRef<HTMLDivElement>();
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>();

  useEffect(() => {
    const editor = monaco.editor.create(editorRef.current, editorOptions);

    setEditor(editor);
  }, []);

  useEffect(() => {
    editor?.setValue(code);
  }, [code, editor]);

  return (
    <div ref={editorRef} style={{height: '100%', width: '100%'}} />
  );
}
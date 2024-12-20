// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import React from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { ArrayType, BicepType, BooleanType, DiscriminatedObjectType, IntegerType, ObjectType, ObjectTypeProperty, ObjectTypePropertyFlags, StringLiteralType, StringType, TypeReference, UnionType } from 'bicep-types'
import { InputCard } from './inputCard';

type InputProps<TType, TValue> = {
  typeChain: BicepType[],
  resolveType: (typeReference: TypeReference) => BicepType,
  type: TType,
  required: boolean,
  value: TValue,
  onUpdate: (value: TValue) => void,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GeneralInput: React.FC<InputProps<BicepType, any>> = (props) => {
  if (props.typeChain.indexOf(props.type) > -1) {
    return <Alert variant="warning">This type is not currently supported by this proof-of-concept.</Alert>
  }
  props = { ...props, typeChain: [...props.typeChain, props.type]};

  switch (props.type.type) {
    case 'ArrayType':
      return <ArrayInput {...props} type={props.type} />;
    case 'ObjectType':
      return <ObjectInput {...props} type={props.type} />;
    case 'DiscriminatedObjectType':
      return <DiscriminatedObjectInput {...props} type={props.type} />;
    case 'UnionType':
      return <UnionInput {...props} type={props.type} />;
    case 'BooleanType':
      return <BooleanInput {...props} type={props.type} />;
    case 'IntegerType':
      return <IntegerInput {...props} type={props.type} />;
    case 'StringType':
      return <StringInput {...props} type={props.type} />;
    case 'StringLiteralType':
      return <StringLiteralInput {...props} type={props.type} />;
    default:
      return <Alert variant="warning">The type {props.type.type} is not currently supported by this proof-of-concept.</Alert>
  }
};

export const ArrayInput: React.FC<InputProps<ArrayType, unknown[]>> = (props) => {
  const { resolveType, type, onUpdate } = props;
  const values = props.value ??= [];
  const itemType = resolveType(type.itemType);

  const replaceItem = (index: number, value: unknown) => {
    onUpdate([
      ...values.slice(0, index),
      value,
      ...values.slice(index + 1)
    ]);
  }

  const removeItem = (index: number) => {
    onUpdate([
      ...values.slice(0, index),
      ...values.slice(index + 1)
    ]);
  }

  return (
    <>
      {values.map((value, i) => <>
        <InputCard title={`Item ${i}`} onClose={() => removeItem(i)}>
          <GeneralInput required={true} typeChain={props.typeChain} resolveType={resolveType} type={itemType} value={value} onUpdate={newValue => replaceItem(i, newValue)} />
        </InputCard>
      </>)}
      <Button variant="success" onClick={() => onUpdate([...values, undefined])} >Add</Button>
    </>
  )
};

const hasFlag = (prop: ObjectTypeProperty, flag: ObjectTypePropertyFlags) =>
  (prop.flags & flag) === flag

export const ObjectInput: React.FC<InputProps<ObjectType, Record<string, unknown>>> = (props) => {
  const { resolveType, type, onUpdate } = props;
  const value = props.value ??= {};
  const onPropUpdate = (propName: string, propValue: unknown) => {
    let newValue = { ...value };
    if (propValue === undefined) {
      delete newValue[propName];
    } else {
      newValue[propName] = propValue;
    }

    if (Object.keys(newValue).length === 0) {
      newValue = undefined;
    }

    onUpdate(newValue);
  }

  const validProps = Object.entries(type.properties)
    .map(([name, prop]) => ({ name, prop }))
    .filter(x => !hasFlag(x.prop, ObjectTypePropertyFlags.ReadOnly));

  return (
    <>
      {validProps.map(({ name, prop }) =>
        <InputCard
          title={name}
          onClose={value[name] !== undefined ? () => onPropUpdate(name, undefined) : undefined}
          description={prop.description}>
          <GeneralInput resolveType={resolveType} typeChain={props.typeChain} required={props.required && hasFlag(prop, ObjectTypePropertyFlags.Required)} type={resolveType(prop.type)} value={value[name]} onUpdate={x => onPropUpdate(name, x)} />
        </InputCard>
      )}
    </>
  )
};

export const DiscriminatedObjectInput: React.FC<InputProps<DiscriminatedObjectType, Record<string, unknown>>> = (props) => {
  const { resolveType, type, onUpdate } = props;
  const value = props.value ??= {};
  const onPropUpdate = (propName: string, propValue: unknown) => {
    let newValue = { ...value };
    if (propValue === undefined) {
      delete newValue[propName];
    } else {
      newValue[propName] = propValue;
    }

    if (Object.keys(newValue).length === 0) {
      newValue = undefined;
    }

    onUpdate(newValue);
  }

  const discValue = value[type.discriminator] as string;
  const objectType = discValue ? resolveType(type.elements[discValue]) as ObjectType : undefined;
  const allProps = objectType ? { ...type.baseProperties, ...objectType.properties } : {};

  const validProps = Object.entries(allProps)
    .map(([name, prop]) => ({ name, prop }))
    .filter(x => !hasFlag(x.prop, ObjectTypePropertyFlags.ReadOnly));

  return (
    <>
      <InputCard
        title={type.discriminator}
        onClose={value[type.discriminator] !== undefined ? () => onPropUpdate(type.discriminator, undefined) : undefined}>
        <Form.Select isInvalid={discValue === undefined} value={discValue} onChange={e => onPropUpdate(type.discriminator, e.target.value)}>
          {!discValue && <option value=""></option>}
          {Object.keys(type.elements).map(opt => <option>{opt}</option>)}
        </Form.Select>
      </InputCard>
      {validProps.map(({ name, prop }) =>
        <InputCard
          title={name}
          onClose={value[name] !== undefined ? () => onPropUpdate(name, undefined) : undefined}
          description={prop.description}>
          <GeneralInput resolveType={resolveType} typeChain={props.typeChain} required={props.required && hasFlag(prop, ObjectTypePropertyFlags.Required)} type={resolveType(prop.type)} value={value[name]} onUpdate={x => onPropUpdate(name, x)} />
        </InputCard>
      )}
    </>
  )
};

export const UnionInput: React.FC<InputProps<UnionType, string>> = (props) => {
  const { resolveType, type, onUpdate } = props;
  const value = props.value ??= '';
  const isInvalid = props.required && value === undefined;
  const options = type.elements
    .map(x => resolveType(x))
    .filter(x => x.type === 'StringLiteralType');

  return (
    <>
      <Form.Select isInvalid={isInvalid} value={value} onChange={e => onUpdate(e.target.value)}>
        {!value && <option value=""></option>}
        {options.map(opt => <option>{opt.value}</option>)}
      </Form.Select>
    </>
  )
};

export const BooleanInput: React.FC<InputProps<BooleanType, boolean>> = (props) => {
  const { onUpdate } = props;
  const value = props.value ??= false;
  const isInvalid = props.required && value === undefined;
  return (
    <>
      <Form.Check type="checkbox" isInvalid={isInvalid} checked={value} onChange={() => onUpdate(!value)} />
    </>
  )
};

export const IntegerInput: React.FC<InputProps<IntegerType, number>> = (props) => {
  const { onUpdate } = props;
  const value = props.value ??= 0;
  const isInvalid = props.required && value === undefined;
  return (
    <>
      <Form.Control type="number" isInvalid={isInvalid} value={value} onChange={e => onUpdate(parseInt(e.target.value))} />
    </>
  )
};

export const StringInput: React.FC<InputProps<StringType, string>> = (props) => {
  const { onUpdate } = props;
  const value = props.value ??= '';
  const isInvalid = props.required && value === undefined;
  return (
    <Form.Control type="text" isInvalid={isInvalid} value={value} onChange={e => onUpdate(e.target.value)} />
  )
};

export const StringLiteralInput: React.FC<InputProps<StringLiteralType, string>> = (props) => {
  const { onUpdate } = props;
  const value = props.value ??= '';
  const isInvalid = props.required && value === undefined;
  return (
    <Form.Control type="text" isInvalid={isInvalid} value={value} onChange={e => onUpdate(e.target.value)} />
  )
};
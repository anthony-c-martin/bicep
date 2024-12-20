// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import React from "react";
import { Card, CloseButton, Form } from "react-bootstrap";

type Props = {
  title: string;
  description?: string;
  onClose?: () => void;
};

export const InputCard: React.FC<React.PropsWithChildren<Props>> = ({ title, children, description, onClose }) => {
  return (
    <Card className="m-1">
      <Card.Body className="p-1">
        <Form.Group>
          <div>
            <Form.Label>{title}</Form.Label>
            {onClose !== undefined && <CloseButton style={{float: 'right'}} onClick={() => onClose()} />}
          </div>
          {children}
          <div>
          {description && <Form.Text className="text-muted">
            {description}
          </Form.Text>}            
          </div>
        </Form.Group>
      </Card.Body>
    </Card>
  )
};
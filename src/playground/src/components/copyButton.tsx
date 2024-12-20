// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import React, { useState } from "react";
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";

type Props = {
  getContent: () => string;
  title: string;
  description: string;
};

export const CopyButton: React.FC<Props> = ({ title, description, getContent }) => {
  const [copied, setCopied] = useState(false);
  const handleCopyClick = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    navigator.clipboard.writeText(getContent());
  }
  const overlay = (
    <Tooltip id="button-tooltip">
      {description}
    </Tooltip>
  );

  return (
    <OverlayTrigger placement="bottom" overlay={overlay}>
      <Button size="sm" variant="primary" className="mx-1" onClick={handleCopyClick}>{copied ? 'Copied' : title}</Button>
    </OverlayTrigger>
  );
};
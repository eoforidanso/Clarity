import React, { useState } from 'react';

export default function HelpTooltip({ text, children, position = 'top' }) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="help-tooltip-wrapper"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children || (
        <span className="help-tooltip-trigger" tabIndex={0} aria-label="Help">?</span>
      )}
      {show && (
        <span className={`help-tooltip-bubble help-tooltip-${position}`}>
          {text}
          <span className="help-tooltip-arrow" />
        </span>
      )}
    </span>
  );
}

import React from "react";

export const formatMessageNumbers = (msg: string) => {
  if (!msg) return msg;
  return msg.replace(/(\.\d*[1-9])0+(?!\d)/g, "$1").replace(/\.0+(?!\d)/g, "");
};

export const prettifyBackendError = (rawMsg: string, invT: any) => {
  if (!rawMsg) return invT.errors.server;
  const msg = formatMessageNumbers(rawMsg);

  const noRacksMatch = msg.match(
    /No racks found meeting requirements for '(.*?)' \(Dim: (.*?) mm, Temp: (.*?)°C\)/i,
  );
  if (noRacksMatch) {
    return (
      <div className="pretty-error">
        <p>
          <strong>{invT.errors.noRacksMatch.title}</strong> ({noRacksMatch[1]}
          ).
        </p>
        <div className="error-specs">
          <span>
            {invT.errors.noRacksMatch.dimensions}:{" "}
            <strong>{noRacksMatch[2]} mm</strong>
          </span>
          <span>
            {invT.errors.noRacksMatch.temp}:{" "}
            <strong>{noRacksMatch[3]}°C</strong>
          </span>
        </div>
        <p className="error-hint">{invT.errors.noRacksMatch.hint}</p>
      </div>
    );
  }

  if (
    msg.includes("No available slots found") &&
    msg.includes("compatible racks")
  ) {
    return (
      <div className="pretty-error">
        <p>
          <strong>{invT.errors.noAvailableSlots.title}</strong>
        </p>
        <p className="error-hint">{invT.errors.noAvailableSlots.hint}</p>
      </div>
    );
  }

  const productNotFound = msg.match(/Product with barcode (.*?) not found/i);
  if (productNotFound) {
    return (
      <div className="pretty-error">
        <p>
          <strong>{invT.errors.productNotFound.title}</strong> (ID:{" "}
          {productNotFound[1]}).
        </p>
        <p className="error-hint">{invT.errors.productNotFound.hint}</p>
      </div>
    );
  }

  return <div className="pretty-error">{msg}</div>;
};

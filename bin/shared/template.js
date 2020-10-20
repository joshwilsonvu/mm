/*
 * HTML responses for certain errors.
 */

const style = `
body {
  background: #000;
  color: white;
  width: 100%;
  text-align: center;
};
main {
  display: inline-block;
};
`;

exports.unauthorized = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      ${style}
    </style>
  </head>
  <body>
    <main>
      <h1>This device is not allowed to access your mirror.</h4>
      <p>Is it listed in <code>ipAllowlist</code>?</p>
      <p>Check the output of your terminal for more information.</p>
      <button onclick="window.location.reload()">Refresh</button>
    </main>
  </body>
</html>
`;

exports.notFound = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      ${style}
    </style>
  </head>
  <body>
    <main>
      <h1>Something is wrong.</h1>
      <p>Check the output of your terminal for more information.</p>
      <button onclick="window.location.reload()">Refresh</button>
    </main>
  </body>
</html>
`;

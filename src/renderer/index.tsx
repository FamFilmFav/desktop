/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import { init as initNorigin } from '@noriginmedia/norigin-spatial-navigation-core';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import './i18n';

initNorigin({
  debug: false,
  visualDebug: false,
  shouldFocusDOMNode: false,
});

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ChakraProvider } from '@chakra-ui/react';  // Import ChakraProvider

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ChakraProvider>  {/* Wrap your app with ChakraProvider */}
      <App />
    </ChakraProvider>
  </React.StrictMode>
);

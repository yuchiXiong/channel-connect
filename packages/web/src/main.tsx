import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Home from './pages/Home.tsx';
import MobilePage from './pages/Mobile.tsx';
import VConsole from 'vconsole';

const vConsole = new VConsole();
const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: '/mobile',
    element: <MobilePage />,
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)

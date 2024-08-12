import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Home from './pages/Home.tsx';
import MobilePage from './pages/Mobile.tsx';
import VConsole from 'vconsole';
import { Theme } from '@radix-ui/themes';
import './index.css'
import '@radix-ui/themes/styles.css';
import 'react-photo-view/dist/react-photo-view.css';
import { isAndroid, isIos, isWindows } from 'environment';
import classNames from 'classnames';


if (isAndroid || isIos) {
  new VConsole();
}

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
    <Theme
      className={
        classNames(
          'overflow-hidden, rounded-lg'
        )
      }
    >
      <RouterProvider router={router} />
    </Theme>
  </React.StrictMode>,
)

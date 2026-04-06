import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  manifest: {
    name: 'Delivery Tracker for Tesla',
    description:
      'Track your Tesla vehicle delivery status with real-time notifications, delivery timeline, and vehicle configuration decoder.',
    version: '1.0.1',

    permissions: ['storage', 'alarms', 'notifications', 'cookies', 'webNavigation', 'declarativeNetRequest'],

    host_permissions: [
      'https://*.tesla.com/*',
      'https://auth.tesla.com/*',
      'https://owner-api.teslamotors.com/*',
      'https://akamai-apigateway-vfx.tesla.com/*',
      'https://fleet-api.prd.na.vn.cloud.tesla.com/*',
      'https://fleet-api.prd.eu.vn.cloud.tesla.com/*',
      'https://fleet-api.prd.cn.vn.cloud.tesla.cn/*',
    ],

    icons: {
      16: '/icons/icon-16.png',
      48: '/icons/icon-48.png',
      128: '/icons/icon-128.png',
    },

    browser_specific_settings: {
      gecko: {
        id: 'tesla-delivery-tracker@wolanin.dev',
        strict_min_version: '109.0',
      },
    },
  },

  vite: () => ({
    plugins: [preact(), tailwindcss()],
  }),
});

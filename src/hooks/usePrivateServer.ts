import { useContext } from 'react';
import { PrivateServerContext, PrivateServerContextType } from '../contexts/PrivateServerContext.tsx';

export const usePrivateServer = (): PrivateServerContextType => {
  const context = useContext(PrivateServerContext);
  if (!context) {
    throw new Error('usePrivateServer must be used within a PrivateServerProvider');
  }
  return context;
};

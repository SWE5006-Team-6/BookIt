import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MemoryRouterProps } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import type { ReactElement, ReactNode } from 'react';

interface WrapperOptions {
  routerProps?: MemoryRouterProps;
}

function createWrapper(options: WrapperOptions = {}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter {...options.routerProps}>
        <ChakraProvider value={defaultSystem}>
          {children}
        </ChakraProvider>
      </MemoryRouter>
    );
  };
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderOptions & WrapperOptions = {},
) {
  const { routerProps, ...renderOptions } = options;
  return render(ui, {
    wrapper: createWrapper({ routerProps }),
    ...renderOptions,
  });
}

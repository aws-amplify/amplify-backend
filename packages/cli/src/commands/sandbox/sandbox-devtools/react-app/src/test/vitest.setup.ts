import React from 'react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock CSS imports
vi.mock('@cloudscape-design/global-styles/index.css', () => ({}));

// Mock Cloudscape components
vi.mock('@cloudscape-design/components', () => {
  return {
    // Mock for HeaderDescription component that shows status
    HeaderDescription: ({ children }: any) =>
      React.createElement('div', { className: 'header-description' }, children),
    Modal: ({ visible, children, header, footer }: any) => {
      if (!visible) return null;
      return React.createElement('div', { 'data-testid': 'modal' }, [
        header,
        children,
        footer,
      ]);
    },
    Box: ({ children, float }: any) =>
      React.createElement('div', { 'data-float': float }, children),
    SpaceBetween: ({ children, direction, size }: any) =>
      React.createElement(
        'div',
        { 'data-direction': direction, 'data-size': size },
        children,
      ),
    Button: ({
      children,
      variant,
      onClick,
      iconName,
      loading,
      disabled,
      ariaLabel,
      'data-testid': dataTestId,
    }: any) =>
      React.createElement(
        'button',
        {
          onClick,
          'data-variant': variant,
          'data-icon-name': iconName,
          disabled,
          'aria-busy': loading,
          'aria-label': ariaLabel,
          'data-testid': dataTestId,
          type: 'button',
        },
        children,
      ),
    FormField: ({ label, description, children }: any) =>
      React.createElement('div', { className: 'form-field' }, [
        React.createElement('label', {}, label),
        description &&
          React.createElement('div', { className: 'description' }, description),
        children,
      ]),
    Input: ({ value, onChange, placeholder }: any) =>
      React.createElement('input', {
        value: value || '',
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          onChange({ detail: { value: e.target.value } }),
        placeholder,
      }),
    Header: ({ children, actions }: any) => {
      return React.createElement('div', { className: 'header-container' }, [
        React.createElement('h2', { className: 'header' }, children),
        actions &&
          React.createElement('div', { className: 'header-actions' }, actions),
      ]);
    },
    Checkbox: ({ checked, onChange, disabled, children }: any) =>
      React.createElement('label', {}, [
        React.createElement('input', {
          type: 'checkbox',
          checked,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ detail: { checked: e.target.checked } }),
          disabled,
        }),
        children,
      ]),
    Container: ({ children, header }: any) =>
      React.createElement('div', {}, [header, children]),
    AppLayout: ({ content }: any) => React.createElement('div', {}, content),
    Select: ({ selectedOption, options, onChange, placeholder }: any) =>
      React.createElement(
        'select',
        {
          value: selectedOption?.value || '',
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
            onChange({
              detail: {
                selectedOption:
                  options.find((o: any) => o.value === e.target.value) || null,
              },
            }),
        },
        [
          placeholder &&
            React.createElement('option', { value: '' }, placeholder),
          ...(options || []).map((option: any) =>
            React.createElement(
              'option',
              { key: option.value, value: option.value },
              option.label,
            ),
          ),
        ],
      ),
    Multiselect: ({ selectedOptions, options }: any) =>
      React.createElement(
        'div',
        { className: 'multiselect' },
        React.createElement(
          'select',
          { multiple: true },
          (options || []).map((option: any) =>
            React.createElement(
              'option',
              {
                key: option.value,
                value: option.value,
                selected: (selectedOptions || []).some(
                  (o: any) => o.value === option.value,
                ),
              },
              option.label,
            ),
          ),
        ),
      ),
    StatusIndicator: ({ type, children }: any) =>
      React.createElement('span', { 'data-status': type || 'info' }, children),
    TextContent: ({ children }: any) =>
      React.createElement('div', { className: 'text-content' }, children),
    Table: ({ items, columnDefinitions }: any) =>
      React.createElement('table', {}, [
        React.createElement(
          'thead',
          {},
          React.createElement(
            'tr',
            {},
            (columnDefinitions || []).map((col: any, i: number) =>
              React.createElement('th', { key: i }, col.header),
            ),
          ),
        ),
        React.createElement(
          'tbody',
          {},
          (items || []).map((item: any, i: number) =>
            React.createElement(
              'tr',
              { key: i },
              (columnDefinitions || []).map((col: any, j: number) =>
                React.createElement(
                  'td',
                  { key: j },
                  col.cell ? col.cell(item) : item[col.id],
                ),
              ),
            ),
          ),
        ),
      ]),
    Tabs: ({ tabs, activeTabId, onChange }: any) =>
      React.createElement('div', { className: 'tabs' }, [
        React.createElement(
          'div',
          { className: 'tabs-header' },
          (tabs || []).map((tab: any) =>
            React.createElement(
              'button',
              {
                key: tab.id,
                'data-active': tab.id === activeTabId,
                onClick: () => onChange({ detail: { activeTabId: tab.id } }),
              },
              tab.label,
            ),
          ),
        ),
        React.createElement(
          'div',
          { className: 'tab-content' },
          (tabs || []).find((tab: any) => tab.id === activeTabId)?.content,
        ),
      ]),
    Toggle: ({ checked, onChange }: any) =>
      React.createElement('input', {
        type: 'checkbox',
        checked,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          onChange({ detail: { checked: e.target.checked } }),
      }),
    Alert: ({ type, children }: any) =>
      React.createElement('div', { 'data-alert-type': type }, children),
    EmptyState: ({ header, title, children, actions }: any) => {
      return React.createElement('div', { className: 'empty-state' }, [
        React.createElement(
          'div',
          { className: 'empty-state-header' },
          title || header,
        ),
        React.createElement(
          'div',
          { className: 'empty-state-content' },
          children ||
            'No logs available. Logs will appear here when they are generated.',
        ),
        actions &&
          React.createElement(
            'div',
            { className: 'empty-state-actions' },
            actions,
          ),
      ]);
    },
    Spinner: ({ size }: any) =>
      React.createElement(
        'div',
        { className: 'spinner', 'data-size': size },
        'Loading...',
      ),
    ExpandableSection: ({ headerText, children, defaultExpanded, key }: any) =>
      React.createElement(
        'div',
        {
          className: 'expandable-section',
          'data-expanded': defaultExpanded,
          key,
        },
        [
          React.createElement(
            'div',
            { className: 'expandable-header' },
            headerText,
          ),
          React.createElement(
            'div',
            { className: 'expandable-content' },
            children,
          ),
        ],
      ),
    Badge: ({ children, color }: any) =>
      React.createElement(
        'span',
        { className: 'badge', 'data-color': color },
        children,
      ),
    Link: ({ href, external, children, onClick }: any) =>
      React.createElement(
        'a',
        { href, 'data-external': external, onClick },
        children,
      ),
    Grid: ({ gridDefinition, children }: any) => {
      if (Array.isArray(children)) {
        return React.createElement(
          'div',
          { className: 'grid' },
          children.map((child, index) =>
            React.createElement(
              'div',
              {
                key: index,
                className: 'grid-item',
                'data-colspan': gridDefinition?.[index]?.colspan || '12',
              },
              child,
            ),
          ),
        );
      }
      return React.createElement('div', { className: 'grid' }, children);
    },
  };
});

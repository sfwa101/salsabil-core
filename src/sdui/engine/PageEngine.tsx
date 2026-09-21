import React from 'react';
import { PageSchema, SDUIPage, SDUISection } from '../schema/page.schema';
import { componentRegistry } from '../registry/component-registry';
import { UIAction } from '../actions/action-contracts';

interface PageEngineProps {
  pageData: unknown; // Raw JSON from backend
  onAction?: (action: UIAction) => void;
}

export const PageEngine: React.FC<PageEngineProps> = ({ pageData, onAction }) => {
  // 1. Schema Validation
  const validationResult = PageSchema.safeParse(pageData);

  if (!validationResult.success) {
    console.error('[SDUI Engine] Page schema validation failed:', validationResult.error);
    return (
      <div className="p-4 border border-destructive text-destructive rounded-md bg-destructive/10">
        <h3 className="font-bold">SDUI Validation Error</h3>
        <pre className="text-xs mt-2 overflow-auto max-h-[200px]">
          {JSON.stringify(validationResult.error.format(), null, 2)}
        </pre>
      </div>
    );
  }

  const page = validationResult.data;

  // 2. Render Page Sections without if/else logic
  return (
    <div className="sdui-page-container w-full" data-page-id={page.id}>
      {page.sections.map((section: SDUISection) => {
        // Skip disabled sections
        if (section.visibility?.enabled === false) return null;

        const Component = componentRegistry.get(section.type);

        if (!Component) {
          console.warn(`[SDUI Engine] No component registered for type: ${section.type}`);
          // Graceful fallback for missing components
          return (
            <div key={section.id} className="p-4 border border-warning text-warning rounded-md bg-warning/10 my-2">
              <span className="text-sm">Unknown component type: <strong>{section.type}</strong></span>
            </div>
          );
        }

        return (
          <Component 
            key={section.id} 
            sectionId={section.id} 
            props={section.props} 
            onAction={onAction}
          />
        );
      })}
    </div>
  );
};

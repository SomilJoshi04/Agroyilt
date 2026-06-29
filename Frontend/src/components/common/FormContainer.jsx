import React from 'react';

/**
 * FormContainer wraps forms or groups of sections inside a single, unified premium card layout.
 * It automatically adds horizontal dividers (<hr />) between its active children sections.
 */
export const FormContainer = ({ children, className = '' }) => {
  const childrenArray = React.Children.toArray(children).filter(Boolean);

  return (
    <div className={`bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 space-y-6 ${className}`}>
      {childrenArray.map((child, index) => (
        <React.Fragment key={index}>
          {child}
          {index < childrenArray.length - 1 && (
            <hr className="border-slate-100/70" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * FormSection represents a single section inside a FormContainer.
 * It standardizes section subtitles, titles, icons, and spacing.
 */
export const FormSection = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  headerRight, 
  children, 
  className = '', 
  spacing = 'space-y-4',
  titleClassName = 'text-slate-800 text-sm font-black tracking-tight mt-0.5'
}) => {
  return (
    <div className={`${spacing} ${className}`}>
      <div className="flex justify-between items-start">
        <div>
          {subtitle && (
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-1">
              {subtitle}
            </p>
          )}
          {title && (
            <h2 className={titleClassName}>
              {title}
            </h2>
          )}
        </div>
        {headerRight ? (
          headerRight
        ) : (
          Icon && (
            <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center">
              <Icon className="text-slate-600 text-sm" />
            </div>
          )
        )}
      </div>
      {children}
    </div>
  );
};

export default FormContainer;

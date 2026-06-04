import React from 'react';

/**
 * PageWrapper — adds vertical scroll, horizontal padding, and a max-width
 * constraint for standard "content" pages.
 *
 * Full-height pages like Tasks and Calls manage their own layout and should
 * NOT use this wrapper.
 */
export default function PageWrapper({ children, className = '' }) {
  return (
    <div
      className={`h-full overflow-y-auto overflow-x-hidden scroll-smooth custom-scrollbar ${className}`}
    >
      <div className="mx-auto max-w-[1600px] p-4 md:p-8">
        {children}
      </div>
    </div>
  );
}

    import React from 'react';

export default function SectionTitle({ title, subtitle, centered = true }) {
    return (
        <div className={`mb-12 ${centered ? 'text-center' : 'text-left'}`}>
            {subtitle && (
                <span className="text-clay-600 font-medium tracking-widest text-xs uppercase mb-3 block">
                    {subtitle}
                </span>
            )}
            <h2 className="font-serif text-3xl md:text-4xl text-gray-900 leading-tight">
                {title}
            </h2>
        </div>
    );
}
import React from 'react';

const Skeleton = ({ className = '', ...props }) => {
    return (
        <div 
            className={`animate-pulse rounded bg-stone-100/80 ${className}`} 
            {...props} 
        />
    );
};

export const TableSkeleton = ({ rows = 5, columns = [4, 3, 2, 2, 1] }) => {
    return (
        <div className="divide-y divide-stone-100/80">
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4">
                    {columns.map((span, j) => (
                        <div key={j} className={`col-span-${span} flex items-center gap-3`}>
                            {j === 0 && <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />}
                            <div className="w-full space-y-2">
                                <Skeleton className="h-3 w-3/4" />
                                <Skeleton className="h-2 w-1/2 opacity-60" />
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

/**
 * A skeleton component specifically for <tbody> elements.
 * Renders <tr> and <td> tags to maintain table structure.
 */
export const TableBodySkeleton = ({ rows = 5, cols = 5, hasIcon = true }) => {
    return (
        <>
            {[...Array(rows)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            {hasIcon && <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />}
                            <div className="w-full space-y-2">
                                <Skeleton className="h-3 w-32" />
                                <Skeleton className="h-2 w-24 opacity-60" />
                            </div>
                        </div>
                    </td>
                    {[...Array(cols - 1)].map((_, j) => (
                        <td key={j} className="px-6 py-4">
                            <Skeleton className="h-3 w-20" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
};

export default Skeleton;

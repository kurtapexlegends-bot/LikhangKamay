import React from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import CategoryManager from '@/Components/Admin/Catalog/CategoryManager';

export default function CategoriesPage({ categories = [] }) {
    return (
        <>
            <Head title="Categories" />
            <div className="max-w-6xl mx-auto space-y-6">
                <CategoryManager categories={categories} />
            </div>
        </>
    );
}

CategoriesPage.layout = (page) => (
    <AdminLayout title="Categories">{page}</AdminLayout>
);

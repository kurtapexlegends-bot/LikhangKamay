import React from 'react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import FilterSidebar from './FilterSidebar';

export default function CatalogFilterSidebar({
    isFilterOpen = false,
    setIsFilterOpen,
    categories = [],
    availableLocations = [],
    availableMaterials = [],
    categoryCounts = {},
    materialCounts = {},
    locationCounts = {},
    activeCategory = 'All',
    minPrice = '',
    setMinPrice,
    maxPrice = '',
    setMaxPrice,
    minRating = '',
    selectedLocations = [],
    selectedMaterials = [],
    activeFilterCount = 0,
    onCategoryClick,
    onApplyPrice,
    onRatingChange,
    onMaterialChange,
    onLocationChange,
    onClearAll,
}) {
    return (
        <>
            {/* --- LEFT SIDEBAR (Desktop) --- */}
            <FilterSidebar 
                className="hidden lg:block w-64 min-w-[16rem] flex-shrink-0 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain pr-1.5 pb-6"
                categories={categories}
                availableLocations={availableLocations}
                availableMaterials={availableMaterials}
                categoryCounts={categoryCounts}
                materialCounts={materialCounts}
                locationCounts={locationCounts}
                activeCategory={activeCategory}
                minPrice={minPrice}
                setMinPrice={setMinPrice}
                maxPrice={maxPrice}
                setMaxPrice={setMaxPrice}
                minRating={minRating}
                selectedLocations={selectedLocations}
                selectedMaterials={selectedMaterials}
                activeFilterCount={activeFilterCount}
                onCategoryClick={onCategoryClick}
                onApplyPrice={onApplyPrice}
                onRatingChange={onRatingChange}
                onMaterialChange={onMaterialChange}
                onLocationChange={onLocationChange}
                onClearAll={onClearAll}
            />

            {/* --- MOBILE FILTER SIDE PANEL --- */}
            <SlideOverDrawer 
                show={isFilterOpen} 
                onClose={() => setIsFilterOpen(false)}
                title="Filters"
                widthClass="max-w-[280px]"
                position="right"
                footer={
                    <button 
                        onClick={() => setIsFilterOpen(false)}
                        className="w-full py-2.5 bg-stone-900 hover:bg-stone-850 text-white rounded-xl font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-md border border-stone-900"
                    >
                        Show Results
                    </button>
                }
            >
                <div className="custom-sidebar-wrap pb-8">
                    <FilterSidebar 
                        className="block w-full"
                        categories={categories}
                        availableLocations={availableLocations}
                        availableMaterials={availableMaterials}
                        categoryCounts={categoryCounts}
                        materialCounts={materialCounts}
                        locationCounts={locationCounts}
                        activeCategory={activeCategory}
                        minPrice={minPrice}
                        setMinPrice={setMinPrice}
                        maxPrice={maxPrice}
                        setMaxPrice={setMaxPrice}
                        minRating={minRating}
                        selectedLocations={selectedLocations}
                        selectedMaterials={selectedMaterials}
                        activeFilterCount={activeFilterCount}
                        onCategoryClick={(cat) => {
                            onCategoryClick(cat);
                            setIsFilterOpen(false);
                        }}
                        onApplyPrice={() => {
                            onApplyPrice();
                            setIsFilterOpen(false);
                        }}
                        onRatingChange={(rating) => {
                            onRatingChange(rating);
                            setIsFilterOpen(false);
                        }}
                        onMaterialChange={onMaterialChange}
                        onLocationChange={onLocationChange}
                        onClearAll={() => {
                            onClearAll();
                            setIsFilterOpen(false);
                        }}
                    />
                </div>
            </SlideOverDrawer>
        </>
    );
}

import React, { useRef, useEffect } from 'react';
import { createOptimizedScrollAnimation, createOptimizedStaggerAnimation } from '../../../../../utils/optimizedScrollTrigger';
import ServiceWithRatingCard from '../../../components/common/ServiceWithRatingCard';
import { themeColors } from '../../../../../theme';

const ServiceSectionWithRating = React.memo(({ title, subtitle, services, onSeeAllClick, onServiceClick, onAddClick, showTopBorder = true }) => {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const cardsRef = useRef(null);

  // Defer GSAP scroll animations until after initial render for better performance
  useEffect(() => {
    // Skip animations on initial load to improve performance
    const shouldAnimate = typeof window !== 'undefined' &&
      (window.requestIdleCallback || window.setTimeout);

    if (!shouldAnimate || !sectionRef.current || !titleRef.current || !cardsRef.current) {
      // Show content immediately without animation
      if (titleRef.current) titleRef.current.style.opacity = '1';
      if (cardsRef.current) {
        Array.from(cardsRef.current.children).forEach(card => {
          card.style.opacity = '1';
          card.style.transform = 'none';
        });
      }
      return;
    }

    // Defer animation initialization until browser is idle
    const initAnimations = () => {
      const cards = Array.from(cardsRef.current?.children || []);
      if (cards.length === 0) return;

      const cleanupFunctions = [];

      // Animate title
      const titleCleanup = createOptimizedScrollAnimation(
        titleRef.current,
        {
          from: { y: 30, opacity: 0 },
          to: { y: 0, opacity: 1 },
          duration: 0.6,
          ease: 'power2.out',
        },
        { rootMargin: '100px' }
      );
      if (titleCleanup) cleanupFunctions.push(titleCleanup);

      // Stagger animate cards
      const cardsCleanup = createOptimizedStaggerAnimation(
        cards,
        {
          from: { x: 50, opacity: 0, scale: 0.9 },
          to: { x: 0, opacity: 1, scale: 1 },
          duration: 0.5,
          stagger: 0.08,
          ease: 'back.out(1.7)',
        },
        { rootMargin: '150px' }
      );
      if (cardsCleanup) cleanupFunctions.push(cardsCleanup);

      return () => {
        cleanupFunctions.forEach(cleanup => cleanup?.());
      };
    };

    let cleanupFunc = null;
    const runAnimations = () => { cleanupFunc = initAnimations(); };
    // Use requestIdleCallback if available, otherwise setTimeout
    if (window.requestIdleCallback) {
      const idleCallback = window.requestIdleCallback(runAnimations, { timeout: 2000 });
      return () => {
        if (idleCallback) window.cancelIdleCallback(idleCallback);
        if (cleanupFunc) cleanupFunc();
      };
    } else {
      const timeout = setTimeout(runAnimations, 500);
      return () => {
        clearTimeout(timeout);
        if (cleanupFunc) cleanupFunc();
      };
    }
  }, []); // Empty deps - only run once on mount

  return (
    <div ref={sectionRef} className="mb-6">
      {/* Title and Subtitle Section */}
      <div ref={titleRef} className="px-4 mb-5 flex items-center justify-between" style={{ opacity: 1 }}>
        <div>
          <h2
            className="text-xl font-bold mb-1 text-gray-900 tracking-tight"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm font-medium text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
        {onSeeAllClick && (
          <button
            onClick={onSeeAllClick}
            className="font-bold text-xs px-4 py-2 rounded-full transition-all active:scale-95 border"
            style={{
              backgroundColor: `${themeColors.brand.teal}0D`,
              color: themeColors.button,
              borderColor: `${themeColors.brand.teal}1A`
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = themeColors.button;
              e.target.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = `${themeColors.brand.teal}0D`;
              e.target.style.color = themeColors.button;
            }}
          >
            See all
          </button>
        )}
      </div>

      <div ref={cardsRef} className="flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide -mx-0">
        {services.map((service) => (
          <ServiceWithRatingCard
            key={service.id}
            title={service.title}
            rating={service.rating}
            reviews={service.reviews}
            price={service.price}
            originalPrice={service.originalPrice}
            discount={service.discount}
            image={service.image}
            onClick={() => onServiceClick?.(service)}
            onAddClick={() => onAddClick?.(service)}
          />
        ))}
      </div>
    </div>
  );
});

ServiceSectionWithRating.displayName = 'ServiceSectionWithRating';

export default ServiceSectionWithRating;


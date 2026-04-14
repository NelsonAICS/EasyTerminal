import { icons, getIconMetadata, hasIcon } from '../icons';

// Provider SVG Icons component
interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

// Simple SVG parser to extract content and attributes
function parseSvgContent(svg: string): { inner: string; attrs: Record<string, string> } {
  const match = svg.match(/<svg([^>]*)>([\s\S]*)<\/svg>/i);
  if (!match) return { inner: svg, attrs: {} };

  const attrsStr = match[1];
  const inner = match[2];

  // Parse attributes into an object
  const attrs: Record<string, string> = {};
  const attrMatches = attrsStr.matchAll(/(\w+(?:-\w+)?)="([^"]*)"/g);
  for (const m of attrMatches) {
    attrs[m[1]] = m[2];
  }

  return { inner, attrs };
}

export function ProviderIcon({ name, size = 20, className = '' }: IconProps) {
  const metadata = getIconMetadata(name);
  const svgContent = hasIcon(name) ? icons[name] : null;

  if (svgContent) {
    const { inner, attrs } = parseSvgContent(svgContent);

    // Build style with size and currentColor replaced by white
    const style: Record<string, string> = {
      width: `${size}px`,
      height: `${size}px`,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
    };

    // Process inner content - replace currentColor and dark colors with white
    // Keep meaningful colors: blue (#4285F4), orange (#D4915D), green (#00A672), etc.
    let processedInner = inner.replace(/currentColor/g, '#FFFFFF');
    // Replace dark fills (brightness < 60) with white for dark theme visibility
    processedInner = processedInner.replace(/fill="#([0-9a-fA-F]{6})"/g, (match, color) => {
      const r = parseInt(color.substr(0, 2), 16);
      const g = parseInt(color.substr(2, 2), 16);
      const b = parseInt(color.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      if (brightness < 60) {
        return 'fill="#FFFFFF"';
      }
      return match;
    });
    // Also replace dark strokes with white
    processedInner = processedInner.replace(/stroke="#([0-9a-fA-F]{6})"/g, (match, color) => {
      const r = parseInt(color.substr(0, 2), 16);
      const g = parseInt(color.substr(2, 2), 16);
      const b = parseInt(color.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      if (brightness < 60) {
        return 'stroke="#FFFFFF"';
      }
      return match;
    });
    processedInner = processedInner.replace(/stroke="currentColor"/g, 'stroke="#FFFFFF"');

    // Build the viewBox if not present but width/height are
    let viewBox = attrs.viewBox;
    if (!viewBox && attrs.width && attrs.height) {
      viewBox = `0 0 ${attrs.width} ${attrs.height}`;
    }

    // Transfer fill from original SVG root (currentColor → white for dark theme)
    const rootFill = attrs.fill === 'currentColor' ? '#FFFFFF' : attrs.fill;

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={viewBox || `0 0 24 24`}
        fill={rootFill || undefined}
        fillRule={(attrs['fill-rule'] as 'inherit' | 'nonzero' | 'evenodd') || undefined}
        style={style}
        className={className}
        dangerouslySetInnerHTML={{ __html: processedInner }}
      />
    );
  }

  // Fallback: colored square with initials
  const displayName = metadata?.displayName || name;
  const initials = displayName.slice(0, 2).toUpperCase();
  const color = metadata?.defaultColor || '#666666';

  return (
    <div
      className={`inline-flex items-center justify-center rounded-md flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        backgroundColor: color,
        color: 'white',
        fontWeight: 600,
        lineHeight: 1
      }}
    >
      {initials}
    </div>
  );
}

export function AppIcon({ name, size = 20, className = '' }: IconProps) {
  return <ProviderIcon name={name} size={size} className={className} />;
}

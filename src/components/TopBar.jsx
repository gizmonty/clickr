/**
 * Shared top bar used on every screen.
 * - Logo centered
 * - Optional left slot (back button / breadcrumb)
 * - Optional right slot (user avatar / actions)
 */
export default function TopBar({ onLogoClick, left, right }) {
  return (
    <div className="relative flex items-center justify-center px-4 py-4 border-b border-gray-100 bg-white">
      {/* Left slot */}
      <div className="absolute left-4 flex items-center">
        {left}
      </div>

      {/* Centered logo */}
      <button
        onClick={onLogoClick}
        className="text-xl font-semibold text-gray-800 hover:text-blue-500 transition-colors cursor-pointer tracking-tight"
      >
        .clickr
      </button>

      {/* Right slot */}
      <div className="absolute right-4 flex items-center">
        {right}
      </div>
    </div>
  )
}

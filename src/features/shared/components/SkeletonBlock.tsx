import React from 'react'

export interface SkeletonBlockProps {
  width?: string | number
  height?: string | number
  shape?: 'rectangle' | 'circle'
  style?: React.CSSProperties
  className?: string
}

const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  width = '100%',
  height = '1rem',
  shape = 'rectangle',
  style,
  className,
}) => {
  const computedStyle: React.CSSProperties = {
    width,
    height,
    ...style,
  }

  const classes = ['skeleton', shape === 'circle' ? 'skeleton--circle' : undefined, className]
    .filter(Boolean)
    .join(' ')

  return <span className={classes} style={computedStyle} aria-hidden />
}

export default SkeletonBlock

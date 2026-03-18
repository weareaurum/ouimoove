import styles from './Button.module.css'

export function Button({ children, variant = 'ghost', size = 'md', onClick, type = 'button', disabled, style, className = '' }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={style}
      className={[styles.btn, styles[variant], styles[size], className].join(' ')}
    >
      {children}
    </button>
  )
}

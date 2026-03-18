import styles from './FormInput.module.css'

export function FormGroup({ children }) {
  return <div className={styles.group}>{children}</div>
}

export function FormLabel({ children }) {
  return <label className={styles.label}>{children}</label>
}

export function FormInput({ error, ...props }) {
  return <input className={[styles.input, error ? styles.error : ''].join(' ')} {...props} />
}

export function FormSelect({ children, ...props }) {
  return <select className={styles.input} {...props}>{children}</select>
}

export function FormTextarea({ ...props }) {
  return <textarea className={styles.input} {...props} />
}

export function FormError({ children }) {
  return children ? <p className={styles.errMsg}>{children}</p> : null
}

export function FormDivider({ children }) {
  return (
    <div className={styles.divider}>
      <span>{children}</span>
    </div>
  )
}

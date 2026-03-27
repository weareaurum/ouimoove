import styles from './Toast.module.css'

export function Toast({ toasts }) {
  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <div key={t.id} className={[styles.toast, styles[t.type]].join(' ')}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

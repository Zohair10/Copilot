import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Dashboard.module.css';

const Navigation = () => {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', description: 'Overview & Charts' },
    { href: '/organization', label: 'Organization', description: 'User Analytics' },
    { href: '/languages', label: 'Languages', description: 'Programming Languages' },
    { href: '/editors', label: 'Editors', description: 'IDEs & Editors' },
    { href: '/billing', label: 'Billing', description: 'Seats & Billing' },
    { href: '/tables', label: 'Tables', description: 'Raw Data Tables' }
  ];

  return (
    <nav style={{ 
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #ddd',
      padding: '15px 0',
      marginBottom: '20px'
    }}>
      <div style={{ 
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        <div className={styles.buttonContainer}>
          {navItems.map(({ href, label, description }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.button} ${isActive ? styles.active : ''}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textDecoration: 'none',
                  padding: '12px 20px',
                  minWidth: '120px'
                }}
              >
                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{label}</span>
                <span style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>{description}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

export default function Spinner({ text = '' }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span className="spinner" />
            {text && <span>{text}</span>}
        </span>
    );
}

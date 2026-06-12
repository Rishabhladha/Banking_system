import { useState, useEffect, useContext } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api/client";

export default function Cards() {
    const { user } = useAuth();
    const [cards, setCards] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState("");
    const [loading, setLoading] = useState(true);
    const [flippedMap, setFlippedMap] = useState({});

    useEffect(() => {
        fetchCards();
        fetchAccounts();
    }, []);

    const fetchCards = async () => {
        try {
            const data = await apiRequest("GET", "/api/cards");
            setCards(data.cards);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAccounts = async () => {
        try {
            const data = await apiRequest("GET", "/api/accounts");
            setAccounts(data.accounts.filter(a => a.status === "ACTIVE"));
            if (data.accounts.length > 0) {
                setSelectedAccount(data.accounts[0]._id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleIssueCard = async (e) => {
        e.preventDefault();
        try {
            await apiRequest("POST", "/api/cards/issue", { accountId: selectedAccount });
            alert("Card issued successfully!");
            fetchCards();
        } catch (err) {
            alert(err.message || "Failed to issue card");
        }
    };

    const handleToggleFreeze = async (cardId) => {
        try {
            await apiRequest("POST", `/api/cards/${cardId}/toggle-freeze`);
            fetchCards();
        } catch (err) {
            alert(err.message || "Action failed");
        }
    };

    const toggleFlip = (cardId) => {
        setFlippedMap(prev => ({ ...prev, [cardId]: !prev[cardId] }));
    };

    if (loading) return <div className="page-container"><p>Loading cards...</p></div>;

    return (
        <div className="page-container" style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 className="page-title">Virtual Cards</h1>
            <p style={{ color: "var(--text-muted)", marginBottom: "32px" }}>
                Manage your virtual debit cards for secure online payments.
            </p>

            {cards.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
                    <div style={{ background: "rgba(0, 240, 255, 0.1)", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                        <i className="ri-bank-card-fill" style={{ fontSize: "32px", color: "var(--primary)" }} />
                    </div>
                    <h3 style={{ fontSize: "20px", marginBottom: "12px", color: "var(--text)" }}>No Active Cards</h3>
                    <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>You don't have any virtual cards yet. Issue one instantly to start spending securely.</p>
                    
                    <form onSubmit={handleIssueCard} style={{ display: "inline-flex", gap: "12px", alignItems: "center" }}>
                        <select 
                            className="input-field" 
                            style={{ width: "200px" }}
                            value={selectedAccount}
                            onChange={e => setSelectedAccount(e.target.value)}
                            required
                        >
                            {accounts.map(acc => (
                                <option key={acc._id} value={acc._id}>
                                    {acc.accountType} - {acc.accountNumber?.slice(-4)}
                                </option>
                            ))}
                        </select>
                        <button type="submit" className="btn btn-primary">Issue Virtual Card</button>
                    </form>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "32px" }}>
                    {cards.map(card => {
                        const isFrozen = card.status === "FROZEN";
                        const isFlipped = flippedMap[card._id];
                        
                        return (
                            <div key={card._id} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                
                                {/* 3D Card Container */}
                                <div className="virtual-card-container" onClick={() => toggleFlip(card._id)}>
                                    <div className={`virtual-card-inner ${isFlipped ? "flipped" : ""} ${isFrozen ? "frozen" : ""}`}>
                                        
                                        {/* FRONT */}
                                        <div className="virtual-card-front">
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                <div style={{ fontSize: "22px", fontWeight: "700", fontStyle: "italic", letterSpacing: "1px" }}>NEXA</div>
                                                <div style={{ opacity: 0.8 }}><i className="ri-bank-card-line" style={{ fontSize: "28px" }} /></div>
                                            </div>
                                            
                                            <div style={{ marginTop: "auto" }}>
                                                <div style={{ fontFamily: "monospace", fontSize: "22px", letterSpacing: "3px", marginBottom: "16px", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                                                    {card.cardNumber}
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", textTransform: "uppercase", opacity: 0.8, marginBottom: "4px" }}>
                                                    <span>Cardholder</span>
                                                    <span>Expires</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: "600", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                                                    <span>{card.cardholderName}</span>
                                                    <span>{card.expiryMonth}/{card.expiryYear}</span>
                                                </div>
                                            </div>
                                            {isFrozen && (
                                                <div className="frozen-overlay">
                                                    <i className="ri-snowy-fill" style={{ fontSize: "48px", opacity: 0.8 }} />
                                                    <span style={{ marginTop: "12px", fontWeight: "bold", letterSpacing: "2px" }}>FROZEN</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* BACK */}
                                        <div className="virtual-card-back">
                                            <div style={{ width: "100%", height: "40px", background: "#000", margin: "24px 0", opacity: 0.8 }}></div>
                                            <div style={{ padding: "0 24px" }}>
                                                <div style={{ background: "var(--surface)", height: "36px", display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 16px", borderRadius: "4px", color: "var(--text)" }}>
                                                    <span style={{ fontStyle: "italic", fontWeight: "bold", letterSpacing: "1px" }}>{card.cvv}</span>
                                                </div>
                                                <p style={{ fontSize: "10px", marginTop: "16px", opacity: 0.6, lineHeight: "1.4" }}>
                                                    This card is property of NexaBank. Misuse is subject to prosecution. If found, please return to the nearest branch or call +1 800 NEXA BNK.
                                                </p>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px" }}>
                                    <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                                        Linked to: <span style={{ color: "var(--text)" }}>Acc ending {card.account?.accountNumber?.slice(-4)}</span>
                                    </div>
                                    <button 
                                        className="btn btn-outline" 
                                        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderColor: isFrozen ? "var(--success)" : "var(--error)", color: isFrozen ? "var(--success)" : "var(--error)" }}
                                        onClick={() => handleToggleFreeze(card._id)}
                                    >
                                        <i className={isFrozen ? "ri-play-fill" : "ri-snowy-fill"} style={{ fontSize: "16px" }} />
                                        {isFrozen ? "Unfreeze Card" : "Freeze Card"}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                    
                    <div className="glass-panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "220px", borderStyle: "dashed", opacity: 0.8, cursor: "pointer", transition: "0.2s" }} onClick={() => document.getElementById('issue-new-card').scrollIntoView()}>
                        <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                            <i className="ri-bank-card-line" style={{ fontSize: "24px" }} />
                        </div>
                        <h4 id="issue-new-card">Issue Another Card</h4>
                        <form onSubmit={handleIssueCard} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px", width: "100%", maxWidth: "200px" }}>
                            <select 
                                className="input-field" 
                                value={selectedAccount}
                                onChange={e => setSelectedAccount(e.target.value)}
                            >
                                {accounts.map(acc => (
                                    <option key={acc._id} value={acc._id}>{acc.accountType} - {acc.accountNumber?.slice(-4)}</option>
                                ))}
                            </select>
                            <button className="btn btn-primary" style={{ width: "100%", padding: "8px" }}>Issue</button>
                        </form>
                    </div>

                </div>
            )}
        </div>
    );
}

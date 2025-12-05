import React from "react";
import "./NoticeModal.css";

export default function NoticeModal({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>Unofficial Demo</h2>
        <p>
          This app is an unofficial demo showcasing Retrieve-Augmented Generation (RAG) 
          for answering queries about <strong>CM.com Company</strong>.  
        </p>
        <p>
          Questions outside the scope of the company may not be answered accurately 
          due to limited knowledge sources.
        </p>
        <button onClick={onClose} className="modal-btn">OK</button>
      </div>
    </div>
  );
}

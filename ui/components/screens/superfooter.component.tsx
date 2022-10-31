import React from 'react';
import { setLanguage } from './../../services/useTranslation';

export default function SuperFooterComponent() {

    return <>
        
        <footer className="superfooter" id="superfooter">
            <div>Digimon TCG Engine Server is not affiliated with Bandai. Digimon TCG Engine
                &copy; 2013 - 2022. Please support the offical release.</div>
        </footer>
    </>;
}
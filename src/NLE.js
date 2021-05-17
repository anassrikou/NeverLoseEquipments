"use strict";

const { disableThisMod, enableFoundInRaid } = require('./config.json');

class NLE {
    constructor() {
        this.mod = "Revingly-NeverLoseEquipments";
        Logger.info(`Loading: ${this.mod}`);
        ModLoader.onLoad[this.mod] = this.load.bind(this);
    }

    load() {
        if (!disableThisMod) {
            // Override the original saveProgress method with mine which does not remove the items from player when they die
            // Also marks the items as FIR if the player choose to enable it in the config file (false by default)
            InraidController.saveProgress = this.mySaveProgress;
        }
    }
    
    mySaveProgress(offraidData, sessionID)
    {
        if (!InraidConfig.save.loot)
        {
            return;
        }

        let pmcData = ProfileController.getPmcProfile(sessionID);
        let scavData = ProfileController.getScavProfile(sessionID);
        const isPlayerScav = offraidData.isPlayerScav;

        SaveServer.profiles[sessionID].inraid.character = (isPlayerScav) ? "scav" : "pmc";

        if (!isPlayerScav)
        {
            pmcData = InraidController.setBaseStats(pmcData, offraidData, sessionID);

            // For some reason, offraidData seems to drop the latest insured items.
            // It makes more sense to use profileData's insured items as the source of truth.
            offraidData.profile.InsuredItems = pmcData.InsuredItems;
        }
        else
        {
            scavData = InraidController.setBaseStats(scavData, offraidData, sessionID);
        }

        // Check for exit status
        if (offraidData.exit === "survived" || enableFoundInRaid)
        {
            // mark found items and replace item ID's if enabled in the config file
            offraidData.profile = InraidController.markFoundItems(pmcData, offraidData.profile, isPlayerScav);
        }
        else
        {
            // Or remove the FIR status if the player havn't survived
            offraidData.profile = InraidController.removeFoundItems(offraidData.profile);
        }

        offraidData.profile.Inventory.items = PlzRefactorMeHelper.replaceIDs(offraidData.profile, offraidData.profile.Inventory.items, offraidData.profile.Inventory.fastPanel);

        // set profile equipment to the raid equipment
        if (isPlayerScav)
        {
            scavData = InraidController.setInventory(scavData, offraidData.profile);
            HealthController.resetVitality(sessionID);
            ProfileController.setScavProfile(sessionID, scavData);
            return;
        }
        else
        {
            pmcData = InraidController.setInventory(pmcData, offraidData.profile);
            HealthController.saveVitality(pmcData, offraidData.health, sessionID);
        }
    }
}

module.exports.NLE = NLE;
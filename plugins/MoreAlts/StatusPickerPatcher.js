import { storage } from "@vendetta/plugin";
import { React } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";
import { findInReactTree } from "@vendetta/utils";
import { before as patchBefore } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import AccountSwitcherSettings from "./Settings";

const bunny = window.bunny;
const navigation = bunny?.metro?.findByPropsLazy("getRootNavigationRef");

function getAccountCount() {
    return Object.keys(storage.accounts || {}).length;
}

function openAccountSwitcher(hideSheet) {
    hideSheet?.();
    setTimeout(() => {
        try {
            const nav = navigation?.getRootNavigationRef();
            if (nav) {
                nav.navigate("VendettaCustomPage", {
                    title: "Account Switcher",
                    render: () => React.createElement(AccountSwitcherSettings)
                });
            }
        } catch (e) {
            console.error("[StatusPicker] Nav error:", e);
            showToast("Failed to open Account Switcher", 1);
        }
    }, 100);
}

export default function patchStatusPicker() {
    const patches = [];

    try {
        const patch = patchBefore("render", findByProps("ScrollView").View, (args) => {
            try {
                // Find status picker sheet by looking for "SetCustomStatus" key
                let sheet = findInReactTree(args, (r) => 
                    r?.key === ".$SetCustomStatus" || 
                    r?.key === ".$StatusPicker" ||
                    r?.props?.sheetKey === "SetCustomStatus" ||
                    r?.props?.sheetKey === "StatusPicker"
                );

                // Alternative: find by options containing status-related labels
                if (!sheet) {
                    sheet = findInReactTree(args, (r) => {
                        if (!r?.props?.content?.props?.options) return false;
                        const opts = r.props.content.props.options;
                        return opts.some(o => 
                            o?.label === "Set Custom Status" || 
                            o?.label === "Set a custom status" ||
                            o?.label === "Clear Status"
                        );
                    });
                }

                if (!sheet?.props?.content?.props?.options) return;

                const props = sheet.props.content.props;
                const label = getAccountCount() > 0 ? "Switch Account" : "Add Account";

                // Don't add if already exists
                if (props.options.some(o => o?.label === "Switch Account" || o?.label === "Add Account")) return;

                const option = {
                    label: label,
                    icon: getAssetIDByName("ic_person_add_24px") || getAssetIDByName("ic_add_friend"),
                    onPress: () => openAccountSwitcher(props.hideActionSheet)
                };

                // Find "Set Custom Status" and insert after it
                const idx = props.options.findIndex(o => 
                    o?.label === "Set Custom Status" || 
                    o?.label === "Set a custom status"
                );

                if (idx !== -1) {
                    props.options.splice(idx + 1, 0, option);
                } else {
                    props.options.push(option);
                }

            } catch (e) {
                // Silent fail
            }
        });

        patches.push(patch);
        console.log("[StatusPicker] Patched");

    } catch (e) {
        console.error("[StatusPicker] Failed:", e);
    }

    return () => patches.forEach(p => p?.());
}

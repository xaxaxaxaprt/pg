import { storage } from "@vendetta/plugin";
import { React, NavigationNative } from "@vendetta/metro/common";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { findInReactTree } from "@vendetta/utils";
import { before as patchBefore, after } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import AccountSwitcherSettings from "./Settings";

const UserStore = findByStoreName("UserStore");
const bunny = window.bunny;
const tabsNavigationRef = bunny?.metro?.findByPropsLazy("getRootNavigationRef");

function getAccountCount() {
    return Object.keys(storage.accounts || {}).length;
}

function formatAccountName(account) {
    if (!account || !account.username) return "Unknown Account";
    return account.username;
}

function navigateToAccountSwitcher() {
    try {
        const navigation = tabsNavigationRef?.getRootNavigationRef();
        if (navigation) {
            navigation.navigate("VendettaCustomPage", {
                title: "Account Switcher",
                render: () => React.createElement(AccountSwitcherSettings)
            });
        }
    } catch (e) {
        console.error("[StatusPickerPatcher] Navigation error:", e);
        showToast("Failed to open Account Switcher", 1);
    }
}

export default function patchStatusPicker() {
    const patches = [];

    try {
        // Patch the View render to intercept the status picker sheet
        const statusPickerPatch = patchBefore("render", findByProps("ScrollView").View, (args) => {
            try {
                // Look for the status picker action sheet
                // Common sheet keys: "StatusPicker", "UserStatusSheet", "ChangeOnlineStatus"
                let statusSheet = findInReactTree(args, (r) => {
                    return r?.props?.sheetKey === "StatusPicker" || 
                           r?.props?.sheetKey === "UserStatusSheet" ||
                           r?.props?.sheetKey === "ChangeOnlineStatus" ||
                           r?.key?.includes?.("StatusPicker") ||
                           r?.key?.includes?.("UserStatus");
                });

                if (!statusSheet) {
                    // Try to find by looking for custom status related content
                    statusSheet = findInReactTree(args, (r) => {
                        if (r?.props?.content?.props?.options) {
                            const options = r.props.content.props.options;
                            return options.some(opt => 
                                opt?.label?.includes?.("custom status") || 
                                opt?.label?.includes?.("Custom Status") ||
                                opt?.label?.toLowerCase?.()?.includes?.("status")
                            );
                        }
                        return false;
                    });
                }

                if (!statusSheet?.props?.content?.props?.options) return;

                const props = statusSheet.props.content.props;
                const accountLabel = getAccountCount() > 0 ? "Change Account" : "Add Account";
                
                // Check if we already added our option
                if (props.options.some((option) => 
                    option?.label === "Change Account" || 
                    option?.label === "Add Account"
                )) return;

                // Add account switcher option after "Set a custom status" or at the end
                const accountOption = {
                    label: accountLabel,
                    icon: getAssetIDByName("UserIcon") || getAssetIDByName("ic_group"),
                    onPress: () => {
                        props.hideActionSheet?.();
                        setTimeout(() => {
                            navigateToAccountSwitcher();
                        }, 100);
                    },
                };

                // Find the custom status option index
                const customStatusIndex = props.options.findIndex(opt => 
                    opt?.label?.toLowerCase?.()?.includes?.("custom status")
                );

                if (customStatusIndex !== -1) {
                    // Insert after custom status
                    props.options.splice(customStatusIndex + 1, 0, accountOption);
                } else {
                    // Add at the end
                    props.options.push(accountOption);
                }

            } catch (e) {
                console.error("[StatusPickerPatcher] Patch error:", e);
            }
        });

        patches.push(statusPickerPatch);

        // Alternative: Patch the ActionSheet module directly
        try {
            const ActionSheet = findByProps("openLazy", "hideActionSheet");
            if (ActionSheet) {
                const actionSheetPatch = patchBefore("openLazy", ActionSheet, (args) => {
                    try {
                        const [lazyComponent, sheetKey, config] = args;
                        
                        // Check if this is the status picker sheet
                        if (sheetKey === "StatusPicker" || 
                            sheetKey === "UserStatusSheet" || 
                            sheetKey === "ChangeOnlineStatus" ||
                            sheetKey?.includes?.("Status")) {
                            
                            // Wrap the lazy component to modify its content
                            const originalLazy = lazyComponent;
                            args[0] = async () => {
                                const component = await originalLazy();
                                
                                // Try to patch the component
                                if (component?.default) {
                                    const originalDefault = component.default;
                                    component.default = function(props) {
                                        const result = originalDefault.call(this, props);
                                        
                                        // Try to find and modify options
                                        try {
                                            if (result?.props?.children) {
                                                const options = findInReactTree(result, (r) => 
                                                    Array.isArray(r) && r.some(item => 
                                                        item?.props?.label?.toLowerCase?.()?.includes?.("status")
                                                    )
                                                );
                                                
                                                if (options) {
                                                    const accountLabel = getAccountCount() > 0 ? "Change Account" : "Add Account";
                                                    const hasAccountOption = options.some(opt => 
                                                        opt?.props?.label === "Change Account" || 
                                                        opt?.props?.label === "Add Account"
                                                    );
                                                    
                                                    if (!hasAccountOption) {
                                                        options.push(
                                                            React.createElement("FormRow", {
                                                                key: "account-switcher",
                                                                label: accountLabel,
                                                                leading: React.createElement("FormRow.Icon", {
                                                                    source: getAssetIDByName("UserIcon")
                                                                }),
                                                                onPress: navigateToAccountSwitcher
                                                            })
                                                        );
                                                    }
                                                }
                                            }
                                        } catch (e) {
                                            console.error("[StatusPickerPatcher] Component patch error:", e);
                                        }
                                        
                                        return result;
                                    };
                                }
                                
                                return component;
                            };
                        }
                    } catch (e) {
                        console.error("[StatusPickerPatcher] ActionSheet patch error:", e);
                    }
                });
                
                patches.push(actionSheetPatch);
            }
        } catch (e) {
            console.error("[StatusPickerPatcher] Failed to patch ActionSheet:", e);
        }

        console.log("[StatusPickerPatcher] Successfully patched status picker");

    } catch (error) {
        console.error("[StatusPickerPatcher] Failed to patch:", error);
    }

    return () => {
        patches.forEach(unpatch => unpatch?.());
    };
}

import { React, ReactNative } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { showToast } from "@vendetta/ui/toasts";
import { clipboard } from "@vendetta/metro/common";
import { findByProps, findByStoreName } from "@vendetta/metro";


import { addLog, getLogs, clearLogs } from "./Logger.js";
import { PasswordPrompt } from "./PassPrompt.js";
import { 
  exportAccounts, 
  importAccounts, 
  setExportPassword, 
  removeExportPassword,
  addAccountWithToken,
  addAccountWithCredentials,
  forceLogout
} from "./AccountActions.js";

const UserStore = findByStoreName("UserStore");
const TokenManager = findByProps("getToken");


if (!storage.accounts) storage.accounts = {};
if (!storage.accountOrder) storage.accountOrder = [];
if (!storage.settings) {
  storage.settings = {
    enableCLI: true,
    confirmBeforeDelete: true,
    enableUnsafeFeatures: false,
    addToSidebar: true
  };
} else {
  
  if (storage.settings.enableUnsafeFeatures === undefined) {
    storage.settings.enableUnsafeFeatures = false;
  }
  if (storage.settings.enableCLI === undefined) {
    storage.settings.enableCLI = storage.settings.showAccountNames !== false;
  }
  if (storage.settings.confirmBeforeDelete === undefined) {
    storage.settings.confirmBeforeDelete = true;
  }
  if (storage.settings.addToSidebar === undefined) {
    storage.settings.addToSidebar = true;
  }

  if (storage.settings.showAccountNames !== undefined) {
    delete storage.settings.showAccountNames;
  }
}

addLog('info', 'AccountSwitcher plugin initialized', { 
  accountsCount: Object.keys(storage.accounts).length,
  cliEnabled: storage.settings.enableCLI,
  unsafeFeaturesEnabled: storage.settings.enableUnsafeFeatures 
});

function SettingsPage({ onBack }) {
  useProxy(storage);
  
  const [newToken, setNewToken] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);
  const [importText, setImportText] = React.useState("");
  const [showPasswordDialog, setShowPasswordDialog] = React.useState(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const updateSetting = (key, value) => {
    const newSettings = { ...storage.settings, [key]: value };
    storage.settings = newSettings;
    addLog('info', `Setting updated: ${key}`, { newValue: value });
  };

  const copyLogs = () => {
    const logs = getLogs();
    const logsText = logs.map(log => 
      `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}${log.data ? ' | Data: ' + JSON.stringify(log.data) : ''}`
    ).join('\n');
    
    clipboard.setString(logsText);
    addLog('info', 'Logs copied to clipboard', { count: logs.length });
    showToast(`Copied ${logs.length} log entries to clipboard`, 0);
  };

  const enableUnsafeFeatures = (value) => {
    if (value) {
      showConfirmationAlert({
        title: "Enable Unsafe Features - Security Warning",
        content: "Unsafe features include token copying, manual token adding, and detailed logging. These features can compromise your account security if misused. Tokens provide full access to accounts and should never be shared. Only enable if you understand the security implications.",
        confirmText: "I Understand - Enable",
        cancelText: "Cancel",
        confirmColor: "brand",
        onConfirm: () => updateSetting("enableUnsafeFeatures", true)
      });
    } else {
      updateSetting("enableUnsafeFeatures", false);
    }
  };

  
  const handlePasswordCancel = () => {
    setShowPasswordDialog(null);
  };

  const handlePasswordSuccess = () => {
    const callback = showPasswordDialog.callback;
    setShowPasswordDialog(null);
    callback();
  };

  if (showPasswordDialog) {
    return React.createElement(PasswordPrompt, {
      dialogInfo: showPasswordDialog,
      onCancel: handlePasswordCancel,
      onSuccess: handlePasswordSuccess,
      storage: storage
    });
  }

  return React.createElement(ReactNative.View, { 
    style: { flex: 1, backgroundColor: '#1a1b1e' } 
  }, [
    React.createElement(ReactNative.View, {
      key: "header",
      style: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#111214',
        borderBottomWidth: 0
      }
    }, [
      React.createElement(ReactNative.TouchableOpacity, {
        key: "back",
        onPress: onBack,
        style: { marginRight: 16 }
      }, React.createElement(ReactNative.Text, {
        style: { color: '#5865f2', fontSize: 15, fontWeight: '600' }
      }, "← Back")),
      React.createElement(ReactNative.Text, {
        key: "title",
        style: { color: 'white', fontSize: 18, fontWeight: 'bold' }
      }, "Settings")
    ]),

    React.createElement(ReactNative.ScrollView, {
      key: "content",
      style: { flex: 1, padding: 16 },
      contentContainerStyle: { paddingBottom: 100 }
    }, [
      React.createElement(ReactNative.View, {
        key: "export-import",
        style: { marginBottom: 24 }
      }, [
        React.createElement(ReactNative.Text, {
          key: "export-title",
          style: { color: '#8e9297', fontSize: 12, fontWeight: '700', marginBottom: 16, letterSpacing: 0.5 }
        }, "BACKUP & RESTORE"),
        
        React.createElement(ReactNative.TouchableOpacity, {
          key: "export-btn",
          onPress: () => exportAccounts(storage, setShowPasswordDialog),
          style: {
            backgroundColor: '#5865f2',
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: 12,
            marginBottom: 12,
            alignItems: 'center'
          }
        }, React.createElement(ReactNative.Text, {
          style: { color: 'white', fontSize: 15, fontWeight: '600' }
        }, "Export Accounts")),

        React.createElement(ReactNative.TextInput, {
          key: "import-input",
          placeholder: "Paste exported account data here (or leave empty to use clipboard)...",
          placeholderTextColor: '#72767d',
          value: importText,
          onChangeText: setImportText,
          multiline: true,
          numberOfLines: 4,
          style: {
            backgroundColor: '#2b2d31',
            color: 'white',
            padding: 14,
            borderRadius: 12,
            marginBottom: 12,
            fontSize: 14,
            textAlignVertical: 'top',
            borderWidth: 1,
            borderColor: '#3f4147'
          }
        }),
        
        React.createElement(ReactNative.TouchableOpacity, {
          key: "import-btn",
          onPress: () => importAccounts(storage, setShowPasswordDialog, importText),
          style: {
            backgroundColor: '#248046',
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: 12,
            marginBottom: 12,
            alignItems: 'center'
          }
        }, React.createElement(ReactNative.Text, {
          style: { color: 'white', fontSize: 15, fontWeight: '600' }
        }, "Import Accounts")),

        React.createElement(ReactNative.TouchableOpacity, {
          key: "force-logout-btn",
          onPress: forceLogout,
          style: {
            backgroundColor: '#da373c',
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: 12,
            alignItems: 'center'
          }
        }, React.createElement(ReactNative.Text, {
          style: { color: 'white', fontSize: 15, fontWeight: '600' }
        }, "Force Logout"))
      ]),

      React.createElement(ReactNative.View, {
        key: "export-password",
        style: { marginBottom: 24 }
      }, [
        React.createElement(ReactNative.Text, {
          key: "password-title",
          style: { color: '#8e9297', fontSize: 12, fontWeight: '700', marginBottom: 16, letterSpacing: 0.5 }
        }, "EXPORT PASSWORD PROTECTION"),
        
        storage.settings.exportPasswordHash 
          ? React.createElement(ReactNative.View, { key: "password-set" }, [
              React.createElement(ReactNative.Text, {
                key: "status",
                style: { color: '#43b581', fontSize: 16, marginBottom: 12 }
              }, "Export password is set (hashed)"),
              React.createElement(ReactNative.TouchableOpacity, {
                key: "remove-pwd",
                onPress: () => removeExportPassword(storage, setShowPasswordDialog),
                style: {
                  backgroundColor: '#f04747',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  alignItems: 'center'
                }
              }, React.createElement(ReactNative.Text, {
                style: { color: 'white', fontSize: 16, fontWeight: 'bold' }
              }, "Remove Password"))
            ])
          : React.createElement(ReactNative.View, { key: "password-unset" }, [
              React.createElement(ReactNative.Text, {
                key: "desc",
                style: { color: '#72767d', fontSize: 14, marginBottom: 12 }
              }, "Set a password to protect your account exports and imports (will be hashed for security)"),
              
              React.createElement(ReactNative.TextInput, {
                key: "new-password",
                placeholder: "New password",
                placeholderTextColor: '#72767d',
                value: newPassword,
                onChangeText: setNewPassword,
                secureTextEntry: true,
                style: {
                  backgroundColor: '#40444b',
                  color: 'white',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 8,
                  fontSize: 14
                }
              }),
              
              React.createElement(ReactNative.TextInput, {
                key: "confirm-password",
                placeholder: "Confirm password",
                placeholderTextColor: '#72767d',
                value: confirmPassword,
                onChangeText: setConfirmPassword,
                secureTextEntry: true,
                style: {
                  backgroundColor: '#40444b',
                  color: 'white',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: 14
                }
              }),
              
              React.createElement(ReactNative.TouchableOpacity, {
                key: "set-password",
                onPress: () => setExportPassword(storage, newPassword, confirmPassword, setNewPassword, setConfirmPassword),
                style: {
                  backgroundColor: '#7289da',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  alignItems: 'center'
                }
              }, React.createElement(ReactNative.Text, {
                style: { color: 'white', fontSize: 16, fontWeight: 'bold' }
              }, "Set Password"))
            ])
      ]),

      React.createElement(ReactNative.View, {
        key: "unsafe",
        style: { marginBottom: 24 }
      }, [
        React.createElement(ReactNative.Text, {
          key: "unsafe-title",
          style: { color: '#da373c', fontSize: 12, fontWeight: '700', marginBottom: 16, letterSpacing: 0.5 }
        }, "UNSAFE FEATURES"),
        
        React.createElement(ReactNative.View, {
          key: "enable-unsafe",
          style: { 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            paddingVertical: 12,
            backgroundColor: '#2b2d31',
            paddingHorizontal: 16,
            borderRadius: 12,
            marginBottom: 8
          }
        }, [
          React.createElement(ReactNative.View, { 
            key: "text-container", 
            style: { flex: 1 } 
          }, [
            React.createElement(ReactNative.Text, {
              key: "label",
              style: { color: 'white', fontSize: 16 }
            }, "Enable Unsafe Features"),
            React.createElement(ReactNative.Text, {
              key: "desc",
              style: { color: '#72767d', fontSize: 12, marginTop: 2 }
            }, "Allows token operations, detailed logging, and troubleshooting")
          ]),
          React.createElement(ReactNative.Switch, {
            key: "toggle",
            value: storage.settings.enableUnsafeFeatures,
            onValueChange: enableUnsafeFeatures,
            trackColor: { false: '#72767d', true: '#f04747' },
            thumbColor: 'white'
          })
        ]),

        storage.settings.enableUnsafeFeatures && React.createElement(ReactNative.View, {
          key: "unsafe-features",
          style: { marginTop: 16 }
        }, [
          React.createElement(ReactNative.Text, {
            key: "logging-title",
            style: { color: '#b9bbbe', fontSize: 14, fontWeight: 'bold', marginBottom: 8 }
          }, "TROUBLESHOOTING & LOGGING"),
          
          React.createElement(ReactNative.View, {
            key: "log-actions",
            style: { flexDirection: 'row', gap: 8, marginBottom: 16 }
          }, [
            React.createElement(ReactNative.TouchableOpacity, {
              key: "copy-logs",
              onPress: copyLogs,
              style: {
                flex: 1,
                backgroundColor: '#7289da',
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 6,
                alignItems: 'center'
              }
            }, React.createElement(ReactNative.Text, {
              style: { color: 'white', fontSize: 14, fontWeight: 'bold' }
            }, `Copy Logs (${getLogs().length})`)),
            
            React.createElement(ReactNative.TouchableOpacity, {
              key: "clear-logs",
              onPress: clearLogs,
              style: {
                flex: 1,
                backgroundColor: '#f04747',
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 6,
                alignItems: 'center'
              }
            }, React.createElement(ReactNative.Text, {
              style: { color: 'white', fontSize: 14, fontWeight: 'bold' }
            }, "Clear Logs"))
          ]),
          
          React.createElement(ReactNative.Text, {
            key: "token-title",
            style: { color: '#b9bbbe', fontSize: 14, fontWeight: 'bold', marginBottom: 8 }
          }, "ADD ACCOUNT VIA TOKEN"),
          
          React.createElement(ReactNative.TextInput, {
            key: "token-input",
            placeholder: "Paste account token here (leave empty to add current account)...",
            placeholderTextColor: '#72767d',
            value: newToken,
            onChangeText: setNewToken,
            secureTextEntry: true,
            style: {
              backgroundColor: '#40444b',
              color: 'white',
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 14
            }
          }),
          
          React.createElement(ReactNative.TouchableOpacity, {
            key: "add-btn",
            onPress: () => addAccountWithToken(storage, newToken, setNewToken, setIsAdding),
            disabled: isAdding,
            style: {
              backgroundColor: isAdding ? '#5c6bc0' : '#7289da',
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 8,
              alignItems: 'center',
              opacity: isAdding ? 0.6 : 1
            }
          }, React.createElement(ReactNative.Text, {
            style: { color: 'white', fontSize: 16, fontWeight: 'bold' }
          }, isAdding ? "Adding..." : (newToken.trim() ? "Add Account" : "Add Current Account")))
        ])
      ]),

      React.createElement(ReactNative.View, {
        key: "general",
        style: { marginBottom: 24 }
      }, [
        React.createElement(ReactNative.Text, {
          key: "general-title",
          style: { color: '#b9bbbe', fontSize: 14, fontWeight: 'bold', marginBottom: 12 }
        }, "GENERAL"),
        
        React.createElement(ReactNative.View, {
          key: "enable-cli",
          style: { 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            paddingVertical: 12,
            backgroundColor: '#2b2d31',
            paddingHorizontal: 16,
            borderRadius: 12,
            marginBottom: 8
          }
        }, [
          React.createElement(ReactNative.Text, {
            key: "label",
            style: { color: 'white', fontSize: 16 }
          }, "Enable CLI Interface"),
          React.createElement(ReactNative.Switch, {
            key: "toggle",
            value: storage.settings.enableCLI,
            onValueChange: (v) => updateSetting("enableCLI", v),
            trackColor: { false: '#72767d', true: '#7289da' },
            thumbColor: 'white'
          })
        ]),

        React.createElement(ReactNative.View, {
          key: "add-to-sidebar",
          style: { 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            paddingVertical: 12,
            backgroundColor: '#2b2d31',
            paddingHorizontal: 16,
            borderRadius: 12,
            marginBottom: 8
          }
        }, [
          React.createElement(ReactNative.View, { 
            key: "text-container", 
            style: { flex: 1 } 
          }, [
            React.createElement(ReactNative.Text, {
              key: "label",
              style: { color: 'white', fontSize: 16 }
            }, "Add to Settings Sidebar"),
            React.createElement(ReactNative.Text, {
              key: "desc",
              style: { color: '#72767d', fontSize: 12, marginTop: 2 }
            }, "Show Account Switcher in Revenge settings menu")
          ]),
          React.createElement(ReactNative.Switch, {
            key: "toggle",
            value: storage.settings.addToSidebar,
            onValueChange: (v) => {
              updateSetting("addToSidebar", v);
              if (v) {
                showToast("Sidebar enabled - restart app to see changes", 0);
              } else {
                showToast("Sidebar disabled - restart app to remove", 0);
              }
            },
            trackColor: { false: '#72767d', true: '#7289da' },
            thumbColor: 'white'
          })
        ]),

        React.createElement(ReactNative.View, {
          key: "confirm-delete",
          style: { 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            paddingVertical: 12,
            backgroundColor: '#36393f',
            paddingHorizontal: 16,
            borderRadius: 8
          }
        }, [
          React.createElement(ReactNative.Text, {
            key: "label",
            style: { color: 'white', fontSize: 16 }
          }, "Confirm Before Delete"),
          React.createElement(ReactNative.Switch, {
            key: "toggle",
            value: storage.settings.confirmBeforeDelete,
            onValueChange: (v) => updateSetting("confirmBeforeDelete", v),
            trackColor: { false: '#72767d', true: '#7289da' },
            thumbColor: 'white'
          })
        ])
      ])
    ])
  ]);
}

export default function AccountsManager(props) {
  useProxy(storage);

  const [showSettings, setShowSettings] = React.useState(false);
  const [switchingTo, setSwitchingTo] = React.useState(null);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isAddingDynamic, setIsAddingDynamic] = React.useState(false);
  const [mfaCode, setMfaCode] = React.useState("");
  const [mfaTicket, setMfaTicket] = React.useState(null);
  const [showMfaDialog, setShowMfaDialog] = React.useState(false);

  const currentUserId = UserStore.getCurrentUser()?.id;

  const removeAccount = (accountId) => {
    const account = storage.accounts[accountId];
    if (!account) return;
    
    const isCurrent = accountId === currentUserId;
    const accountName = account.username;
    addLog('info', 'Attempting to remove account', { username: accountName, isCurrent });

    const deleteFromStorage = () => {
      delete storage.accounts[accountId];
      storage.accountOrder = storage.accountOrder.filter(id => id !== accountId);
    };

    const removeFromSwitcherOnly = () => {
      deleteFromStorage();
      addLog('info', 'Account removed from switcher only', { username: accountName });
      showToast(`Account ${accountName} removed from switcher`, 0);
    };

    const logoutAndDelete = async () => {
      try {
        addLog('info', 'Starting account removal and logout', { username: accountName });
        const currentToken = TokenManager.getToken();
        
        await findByProps("login", "logout", "switchAccountToken").switchAccountToken(account.token);
        addLog('debug', 'Switched to account for logout');
        
        await findByProps("login", "logout").logout();
        addLog('debug', 'Account logged out from Discord');
        
        setTimeout(async () => {
          try {
            await findByProps("login", "logout", "switchAccountToken").switchAccountToken(currentToken);
            addLog('debug', 'Switched back to original account');
          } catch (e) {
            addLog('warn', 'Could not switch back to original account', { error: e.message });
          }
        }, 100);
      } catch (e) {
        addLog('error', 'Failed to logout account from Discord', { error: e.message });
        showToast("Failed to logout, but removed from switcher", 1);
      }
      
      deleteFromStorage();
      addLog('info', 'Account removed and logged out', { username: accountName });
      showToast(`Account ${accountName} removed and logged out`, 0);
    };

    if (storage.settings.confirmBeforeDelete) {
      ReactNative.Alert.alert(
        isCurrent ? "Remove Current Account" : "Remove Account",
        isCurrent 
          ? "Do you want to remove the current account from the switcher? (To logout, use Force Logout in settings)" 
          : `What do you want to do with ${accountName}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete from switcher only", onPress: removeFromSwitcherOnly },
          !isCurrent && { text: "Delete and logout", onPress: logoutAndDelete },
        ].filter(Boolean)
      );
    } else {
      if (isCurrent) {
        removeFromSwitcherOnly();
      } else {
        logoutAndDelete();
      }
    }
  };

  const refreshAccountInfo = async (accountId) => {
    const account = storage.accounts[accountId];
    if (!account) return false;
    
    try {
      const response = await fetch("https://discord.com/api/v9/users/@me", {
        headers: { "Authorization": account.token }
      });
      
      if (!response.ok) {
        addLog('warn', 'Token invalid for account', { username: account.username, status: response.status });
        return false;
      }
      
      const userData = await response.json();
      
      // Update stored account info
      storage.accounts[accountId] = {
        ...account,
        username: userData.username,
        discriminator: userData.discriminator,
        avatar: userData.avatar,
        displayName: userData.global_name || userData.username
      };
      
      addLog('info', 'Account info refreshed', { username: userData.username });
      return true;
    } catch (e) {
      addLog('error', 'Failed to refresh account info', { error: e.message });
      return false;
    }
  };

  const switchToAccount = async (accountId) => {
    const account = storage.accounts[accountId];
    if (!account) return;
    setSwitchingTo(accountId);
    
    addLog('info', 'Starting account switch', { username: account.username });
    
    // Validate token first
    const isValid = await refreshAccountInfo(accountId);
    if (!isValid) {
      addLog('error', 'Token invalid, cannot switch', { username: account.username });
      showToast(`Token for ${account.username} is invalid! Re-add the account.`, 1);
      setSwitchingTo(null);
      return;
    }
    
    try {
      showToast(`Switching to ${account.username}...`, 0);
      await findByProps("login", "logout", "switchAccountToken").switchAccountToken(account.token);
      addLog('info', 'Account switch successful', { username: account.username });
      showToast(`Switched to ${account.username}!`, 0);
    } catch (e) {
      addLog('error', 'Account switch failed', { username: account.username, error: e.message });
      console.error("Switch error:", e);
      showToast(`Failed to switch: ${e.message}`, 1);
    }
    setSwitchingTo(null);
  };

  const copyToken = (accountId) => {
    if (!storage.settings.enableUnsafeFeatures) return;
    const account = storage.accounts[accountId];
    if (!account) return;
    
    clipboard.setString(account.token);
    addLog('info', 'Token copied to clipboard', { username: account.username });
    showToast(`Token for ${account.username} copied`, 0);
  };

  const addCurrentAccount = async () => {
    setIsAddingDynamic(true);
    addLog('info', 'Adding current account');
    
    try {
      const token = TokenManager.getToken();
      const currentUser = UserStore.getCurrentUser();
      
      if (!currentUser || storage.accounts[currentUser.id]) {
        const message = storage.accounts[currentUser.id] ? "Current account already saved" : "Failed to get current user";
        addLog('warn', message, { userId: currentUser?.id });
        showToast(message, 1);
        setIsAddingDynamic(false);
        return;
      }

      const newAccount = {
        id: currentUser.id,
        username: currentUser.username,
        discriminator: currentUser.discriminator,
        avatar: currentUser.avatar,
        displayName: currentUser.globalName || currentUser.username,
        token: token,
        addedAt: Date.now()
      };

      storage.accounts[currentUser.id] = newAccount;
      if (!storage.accountOrder.includes(currentUser.id)) {
        storage.accountOrder.push(currentUser.id);
      }

      setShowAddDialog(false);
      addLog('info', 'Current account added successfully', { username: currentUser.username });
      showToast(`Current account ${currentUser.username} added!`, 0);
    } catch (e) {
      addLog('error', 'Failed to add current account', { error: e.message });
      console.error("Add current account error:", e);
      showToast("Failed to add current account", 1);
    }
    setIsAddingDynamic(false);
  };

  const addAccountWithCredentialsHandler = async () => {
    await addAccountWithCredentials(storage, email, password, setEmail, setPassword, setShowAddDialog, setIsAddingDynamic, null, null, setMfaTicket, setShowMfaDialog);
  };

  const submitMfaCode = async () => {
    await addAccountWithCredentials(storage, email, password, setEmail, setPassword, setShowAddDialog, setIsAddingDynamic, mfaCode, mfaTicket, setMfaTicket, setShowMfaDialog);
    setMfaCode("");
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const orderedAccounts = storage.accountOrder
    .filter(id => storage.accounts[id])
    .map(id => storage.accounts[id]);

  if (showSettings) {
    return React.createElement(SettingsPage, {
      onBack: () => setShowSettings(false)
    });
  }

  // 2FA Dialog
  if (showMfaDialog) {
    return React.createElement(ReactNative.View, {
      style: { flex: 1, backgroundColor: '#1a1b1e', justifyContent: 'center', padding: 24 }
    }, [
      React.createElement(ReactNative.View, {
        key: "mfa-card",
        style: { backgroundColor: '#2b2d31', borderRadius: 16, padding: 24 }
      }, [
        React.createElement(ReactNative.Text, {
          key: "mfa-title",
          style: { color: 'white', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 }
        }, "2FA Verification"),
        React.createElement(ReactNative.Text, {
          key: "mfa-desc",
          style: { color: '#8e9297', fontSize: 14, textAlign: 'center', marginBottom: 24 }
        }, "Enter 6-digit code from authenticator or 8-digit backup code"),
        React.createElement(ReactNative.TextInput, {
          key: "mfa-input",
          placeholder: "000000",
          placeholderTextColor: '#72767d',
          value: mfaCode,
          onChangeText: setMfaCode,
          keyboardType: 'default',
          maxLength: 8,
          style: {
            backgroundColor: '#1a1b1e',
            color: 'white',
            padding: 16,
            borderRadius: 12,
            fontSize: 24,
            textAlign: 'center',
            letterSpacing: 8,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#3f4147'
          }
        }),
        React.createElement(ReactNative.TouchableOpacity, {
          key: "mfa-submit",
          onPress: submitMfaCode,
          disabled: (mfaCode.length !== 6 && mfaCode.length !== 8) || isAddingDynamic,
          style: {
            backgroundColor: (mfaCode.length === 6 || mfaCode.length === 8) ? '#5865f2' : '#3f4147',
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 12
          }
        }, React.createElement(ReactNative.Text, {
          style: { color: 'white', fontSize: 16, fontWeight: '600' }
        }, isAddingDynamic ? "Verifying..." : "Verify")),
        React.createElement(ReactNative.TouchableOpacity, {
          key: "mfa-cancel",
          onPress: () => {
            setShowMfaDialog(false);
            setMfaTicket(null);
            setMfaCode("");
          },
          style: { paddingVertical: 12, alignItems: 'center' }
        }, React.createElement(ReactNative.Text, {
          style: { color: '#da373c', fontSize: 14, fontWeight: '600' }
        }, "Cancel"))
      ])
    ]);
  }

  if (showAddDialog) {
    return React.createElement(ReactNative.View, {
      style: { flex: 1, backgroundColor: '#1a1b1e' }
    }, [
      React.createElement(ReactNative.View, {
        key: "add-header",
        style: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          backgroundColor: '#202225',
          borderBottomWidth: 1,
          borderBottomColor: '#40444b'
        }
      }, [
        React.createElement(ReactNative.TouchableOpacity, {
          key: "back",
          onPress: () => {
            setShowAddDialog(false);
            setEmail("");
            setPassword("");
          },
          style: { marginRight: 16 }
        }, React.createElement(ReactNative.Text, {
          style: { color: '#7289da', fontSize: 16 }
        }, "← Back")),
        React.createElement(ReactNative.Text, {
          key: "title",
          style: { color: 'white', fontSize: 18, fontWeight: 'bold' }
        }, "Add Account")
      ]),

      React.createElement(ReactNative.ScrollView, {
        key: "add-content",
        style: { flex: 1 },
        contentContainerStyle: { padding: 16, paddingBottom: 100 }
      }, [
        React.createElement(ReactNative.Text, {
          key: "instruction",
          style: { color: '#b9bbbe', fontSize: 16, marginBottom: 20, textAlign: 'center' }
        }, "Enter your Discord account credentials or add your current account"),
        
        React.createElement(ReactNative.TextInput, {
          key: "email-input",
          placeholder: "Email address",
          placeholderTextColor: '#72767d',
          value: email,
          onChangeText: setEmail,
          keyboardType: "email-address",
          autoCapitalize: "none",
          style: {
            backgroundColor: '#40444b',
            color: 'white',
            padding: 16,
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 16
          }
        }),

        React.createElement(ReactNative.TextInput, {
          key: "password-input",
          placeholder: "Password",
          placeholderTextColor: '#72767d',
          value: password,
          onChangeText: setPassword,
          secureTextEntry: true,
          style: {
            backgroundColor: '#40444b',
            color: 'white',
            padding: 16,
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 16
          }
        }),
        
        React.createElement(ReactNative.TouchableOpacity, {
          key: "login-btn",
          onPress: addAccountWithCredentialsHandler,
          disabled: isAddingDynamic,
          style: {
            backgroundColor: isAddingDynamic ? '#5c6bc0' : '#7289da',
            paddingVertical: 16,
            paddingHorizontal: 20,
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: 12,
            opacity: isAddingDynamic ? 0.6 : 1
          }
        }, React.createElement(ReactNative.Text, {
          style: { color: 'white', fontSize: 18, fontWeight: 'bold' }
        }, isAddingDynamic ? "Adding Account..." : "Add Account with Email & Password")),

        React.createElement(ReactNative.View, {
          key: "divider",
          style: {
            height: 1,
            backgroundColor: '#40444b',
            marginVertical: 16
          }
        }),

        React.createElement(ReactNative.TouchableOpacity, {
          key: "add-current-btn",
          onPress: addCurrentAccount,
          disabled: isAddingDynamic,
          style: {
            backgroundColor: isAddingDynamic ? '#5c6bc0' : '#43b581',
            paddingVertical: 16,
            paddingHorizontal: 20,
            borderRadius: 8,
            alignItems: 'center',
            opacity: isAddingDynamic ? 0.6 : 1
          }
        }, React.createElement(ReactNative.Text, {
          style: { color: 'white', fontSize: 18, fontWeight: 'bold' }
        }, isAddingDynamic ? "Adding..." : "Add Current Account"))
      ])
    ]);
  }

  return React.createElement(ReactNative.View, {
    style: { flex: 1, backgroundColor: '#1a1b1e' }
  }, [
    React.createElement(ReactNative.View, {
      key: "header",
      style: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: '#111214',
        borderBottomWidth: 0
      }
    }, [
      React.createElement(ReactNative.Text, {
        key: "title",
        style: { color: 'white', fontSize: 22, fontWeight: '700' }
      }, "Account Switcher"),
      React.createElement(ReactNative.TouchableOpacity, {
        key: "settings-btn",
        onPress: () => setShowSettings(true),
        style: {
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 10,
          backgroundColor: '#2b2d31'
        }
      }, React.createElement(ReactNative.Text, {
        style: { color: '#b5bac1', fontSize: 14, fontWeight: '600' }
      }, "Settings"))
    ]),

    React.createElement(ReactNative.View, {
      key: "accounts-section",
      style: { flex: 1, padding: 16 }
    }, [
      React.createElement(ReactNative.Text, {
        key: "section-title",
        style: { color: '#8e9297', fontSize: 12, fontWeight: '700', marginBottom: 16, letterSpacing: 0.5 }
      }, `SAVED ACCOUNTS (${orderedAccounts.length})`),

      orderedAccounts.length === 0 
        ? React.createElement(ReactNative.View, {
            key: "empty",
            style: { 
              alignItems: 'center', 
              justifyContent: 'center', 
              paddingVertical: 40 
            }
          }, [
            React.createElement(ReactNative.Text, {
              key: "empty-text",
              style: { color: '#72767d', fontSize: 16, marginBottom: 8 }
            }, "No accounts saved yet"),
            React.createElement(ReactNative.Text, {
              key: "empty-hint",
              style: { color: '#72767d', fontSize: 14, textAlign: 'center' }
            }, "Access the switcher by pressing the logout button on the main settings page.")
          ])
        : React.createElement(ReactNative.ScrollView, {
            key: "accounts-scroll",
            style: { flex: 1 },
            contentContainerStyle: { paddingBottom: 100 }
          }, orderedAccounts.map((account, index) => {
            const isCurrent = account.id === currentUserId;
            const isSwitching = switchingTo === account.id;
            
            let avatarUrl = `https://cdn.discordapp.com/embed/avatars/1.png`;
            if (account.avatar) {
              avatarUrl = `https://cdn.discordapp.com/avatars/${account.id}/${account.avatar}.png?size=128&_=${Date.now()}`;
            }

            return React.createElement(ReactNative.View, {
              key: account.id,
              style: {
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isCurrent ? '#5865f215' : '#2b2d31',
                borderWidth: isCurrent ? 1 : 0,
                borderColor: '#5865f2',
                borderRadius: 16,
                padding: 14,
                marginBottom: 12
              }
            }, [
              React.createElement(ReactNative.TouchableOpacity, {
                key: "avatar",
                onPress: () => switchToAccount(account.id),
                disabled: isCurrent || isSwitching,
                style: { marginRight: 12 }
              }, React.createElement(ReactNative.Image, {
                source: { uri: avatarUrl },
                style: {
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  opacity: (isCurrent || isSwitching) ? 0.7 : 1
                }
              })),

              React.createElement(ReactNative.View, {
                key: "info",
                style: { flex: 1 }
              }, [
                React.createElement(ReactNative.Text, {
                  key: "name",
                  style: { color: 'white', fontSize: 16, fontWeight: 'bold' }
                }, `${index + 1}. ${storage.settings.enableCLI ? `${account.username}${account.discriminator !== "0" ? `#${account.discriminator}` : ''}` : account.displayName}`),
                React.createElement(ReactNative.Text, {
                  key: "status",
                  style: { 
                    color: isCurrent ? '#43b581' : '#72767d', 
                    fontSize: 12,
                    marginTop: 2
                  }
                }, isCurrent ? "Current Account" : 
                   isSwitching ? "Switching..." : 
                   "Tap avatar to switch"),
                React.createElement(ReactNative.Text, {
                  key: "date",
                  style: {
                    color: '#72767d',
                    fontSize: 11,
                    marginTop: 2
                  }
                }, `Added: ${formatDate(account.addedAt || Date.now())}`)
              ]),

              React.createElement(ReactNative.View, {
                key: "actions",
                style: { flexDirection: 'column', alignItems: 'flex-end' }
              }, [
                storage.settings.enableUnsafeFeatures && React.createElement(ReactNative.TouchableOpacity, {
                  key: "copy",
                  onPress: () => copyToken(account.id),
                  style: {
                    backgroundColor: '#3f4147',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    minWidth: 80,
                    alignItems: 'center',
                    marginBottom: 6
                  }
                }, React.createElement(ReactNative.Text, {
                  style: { color: 'white', fontSize: 12, fontWeight: 'bold' }
                }, "Copy Token")),

                React.createElement(ReactNative.TouchableOpacity, {
                  key: "remove",
                  onPress: () => removeAccount(account.id),
                  style: {
                    backgroundColor: '#da373c',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    minWidth: 80,
                    alignItems: 'center'
                  }
                }, React.createElement(ReactNative.Text, {
                  style: { color: 'white', fontSize: 12, fontWeight: 'bold' }
                }, "Remove"))
              ])
            ]);
          }))
    ]),

    React.createElement(ReactNative.View, {
      key: "bottom-actions",
      style: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#111214',
        borderTopWidth: 0,
        paddingVertical: 16,
        paddingHorizontal: 20,
        paddingBottom: 40
      }
    }, React.createElement(ReactNative.TouchableOpacity, {
      key: "add",
      onPress: () => setShowAddDialog(true),
      style: {
        backgroundColor: '#5865f2',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 14,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center'
      }
    }, [
      React.createElement(ReactNative.Text, {
        key: "add-icon",
        style: { color: 'white', fontSize: 20, marginRight: 8 }
      }, "+"),
      React.createElement(ReactNative.Text, {
        key: "add-text",
        style: { color: 'white', fontSize: 18, fontWeight: 'bold' }
      }, "Add Account")
    ]))
  ]);
}

export { addLog };

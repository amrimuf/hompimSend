-- CreateTable
CREATE TABLE "User" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "first_name" VARCHAR(128) NOT NULL,
    "last_name" VARCHAR(128),
    "username" VARCHAR(128) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "account_api_key" VARCHAR(128),
    "google_id" VARCHAR(128),
    "affiliation_code" VARCHAR(128) NOT NULL,
    "email_otp_secret" VARCHAR(255),
    "refresh_token" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "email_verfied_at" TIMESTAMP(3),
    "privilege_id" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "CustomerService" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "refresh_token" VARCHAR(255),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "deviceId" INTEGER,
    "privilege_id" INTEGER,

    CONSTRAINT "CustomerService_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "Privilege" (
    "pkId" INTEGER NOT NULL,
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,

    CONSTRAINT "Privilege_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "PrivilegeRole" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "isVisible" BOOLEAN NOT NULL,
    "isCreate" BOOLEAN NOT NULL,
    "isDelete" BOOLEAN NOT NULL,
    "isRead" BOOLEAN NOT NULL,
    "isEdit" BOOLEAN NOT NULL,
    "module_id" INTEGER NOT NULL,
    "privilege_id" INTEGER NOT NULL,

    CONSTRAINT "PrivilegeRole_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "Menu" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "type" VARCHAR(128) NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "MenuPrivilege" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "privilege_id" INTEGER NOT NULL,

    CONSTRAINT "MenuPrivilege_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "Module" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "controller" VARCHAR(255) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "monthly_price" DECIMAL(10,2) NOT NULL,
    "yearly_price" DECIMAL(10,2) NOT NULL,
    "autoReplyQuota" INTEGER,
    "broadcastQuota" INTEGER,
    "contactQuota" INTEGER,
    "deviceQuota" INTEGER,
    "isIntegration" BOOLEAN,
    "isGoogleContactSync" BOOLEAN,
    "isWhatsappContactSync" BOOLEAN,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "pkId" SERIAL NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "autoReplyUsed" INTEGER NOT NULL DEFAULT 0,
    "broadcastUsed" INTEGER NOT NULL DEFAULT 0,
    "contactUsed" INTEGER NOT NULL DEFAULT 0,
    "deviceUsed" INTEGER NOT NULL DEFAULT 0,
    "autoReplyMax" INTEGER NOT NULL DEFAULT 0,
    "broadcastMax" INTEGER NOT NULL DEFAULT 0,
    "contactMax" INTEGER NOT NULL DEFAULT 0,
    "deviceMax" INTEGER NOT NULL DEFAULT 0,
    "subscriptionPlanId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "pkId" SERIAL NOT NULL,
    "order_id" VARCHAR(128) NOT NULL,
    "paid_price" DECIMAL(10,2) NOT NULL,
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "subscriptionPlanId" INTEGER NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "Device" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "phone" VARCHAR(20),
    "api_key" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'close',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "DeviceLog" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "sessionId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceLog_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "Session" (
    "pkId" SERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "deviceId" INTEGER NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "Contact" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "firstName" VARCHAR(128) NOT NULL,
    "lastName" VARCHAR(128),
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "gender" VARCHAR(10),
    "dob" DATE,
    "colorCode" VARCHAR(6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "Label" (
    "pkId" SERIAL NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "slug" VARCHAR(128) NOT NULL,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "DeviceLabel" (
    "pkId" SERIAL NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "labelId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceLabel_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "ContactLabel" (
    "id" SERIAL NOT NULL,
    "contactId" INTEGER NOT NULL,
    "labelId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactGroup" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "contactId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,

    CONSTRAINT "ContactGroup_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "ContactDevice" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "contactId" INTEGER NOT NULL,
    "deviceId" INTEGER NOT NULL,

    CONSTRAINT "ContactDevice_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "Group" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "type" VARCHAR(128) NOT NULL,
    "userId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "OutgoingMessage" (
    "pkId" SERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "message" TEXT,
    "mediaPath" TEXT,
    "schedule" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT,
    "contactId" INTEGER,

    CONSTRAINT "OutgoingMessage_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "IncomingMessage" (
    "pkId" SERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "mediaPath" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT,
    "contactId" INTEGER,

    CONSTRAINT "IncomingMessage_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "recipients" TEXT[],
    "message" VARCHAR(255) NOT NULL,
    "schedule" TIMESTAMP(3) NOT NULL,
    "delay" INTEGER NOT NULL,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "mediaPath" TEXT,
    "deviceId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "AutoReply" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "requests" TEXT[],
    "response" VARCHAR(255) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "recipients" TEXT[],
    "mediaPath" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" INTEGER NOT NULL,

    CONSTRAINT "AutoReply_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "registration_syntax" VARCHAR(128) NOT NULL,
    "unregistration_syntax" VARCHAR(128) NOT NULL,
    "registration_message" VARCHAR(255) NOT NULL,
    "message_registered" VARCHAR(255) NOT NULL,
    "message_failed" VARCHAR(255) NOT NULL,
    "message_unregistered" VARCHAR(255) NOT NULL,
    "recipients" TEXT[],
    "delay" INTEGER NOT NULL,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "schedule" TIMESTAMP(3) NOT NULL,
    "mediaPath" TEXT,
    "group_id" INTEGER NOT NULL,
    "device_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "CampaignMessage" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "delay" INTEGER NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "schedule" TIMESTAMP(3) NOT NULL,
    "mediaPath" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignMessage_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "BusinessHour" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "mon_start" INTEGER DEFAULT 1440,
    "mon_end" INTEGER DEFAULT 0,
    "tue_start" INTEGER DEFAULT 1440,
    "tue_end" INTEGER DEFAULT 0,
    "wed_start" INTEGER DEFAULT 1440,
    "wed_end" INTEGER DEFAULT 0,
    "thu_start" INTEGER DEFAULT 1440,
    "thu_end" INTEGER DEFAULT 0,
    "fri_start" INTEGER DEFAULT 1440,
    "fri_end" INTEGER DEFAULT 0,
    "sat_start" INTEGER DEFAULT 1440,
    "sat_end" INTEGER DEFAULT 0,
    "sun_start" INTEGER DEFAULT 1440,
    "sun_end" INTEGER DEFAULT 0,
    "timezone" VARCHAR(128) NOT NULL,
    "deviceId" INTEGER NOT NULL,

    CONSTRAINT "BusinessHour_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "Order" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "phone" TEXT,
    "orderData" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "csId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "OrderMessage" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "orderTemplate" TEXT NOT NULL,
    "welcomeMessage" TEXT NOT NULL,
    "processMessage" TEXT NOT NULL,
    "completeMessage" TEXT NOT NULL,
    "csId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderMessage_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "Template" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "message" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "pkId" SERIAL NOT NULL,
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "reset_token_expires" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("pkId")
);

-- CreateTable
CREATE TABLE "Message" (
    "pkId" BIGSERIAL NOT NULL,
    "sessionId" TEXT,
    "remoteJid" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "agentId" TEXT,
    "bizPrivacyStatus" INTEGER,
    "broadcast" BOOLEAN,
    "clearMedia" BOOLEAN,
    "duration" INTEGER,
    "ephemeralDuration" INTEGER,
    "ephemeralOffToOn" BOOLEAN,
    "ephemeralOutOfSync" BOOLEAN,
    "ephemeralStartTimestamp" BIGINT,
    "finalLiveLocation" JSONB,
    "futureproofData" BYTEA,
    "ignore" BOOLEAN,
    "keepInChat" JSONB,
    "key" JSONB NOT NULL,
    "labels" JSONB,
    "mediaCiphertextSha256" BYTEA,
    "mediaData" JSONB,
    "message" JSONB,
    "messageC2STimestamp" BIGINT,
    "messageSecret" BYTEA,
    "messageStubParameters" JSONB,
    "messageStubType" INTEGER,
    "messageTimestamp" BIGINT,
    "multicast" BOOLEAN,
    "originalSelfAuthorUserJidString" TEXT,
    "participant" TEXT,
    "paymentInfo" JSONB,
    "photoChange" JSONB,
    "pollAdditionalMetadata" JSONB,
    "pollUpdates" JSONB,
    "pushName" TEXT,
    "quotedPaymentInfo" JSONB,
    "quotedStickerData" JSONB,
    "reactions" JSONB,
    "revokeMessageTimestamp" BIGINT,
    "starred" BOOLEAN,
    "status" INTEGER,
    "statusAlreadyViewed" BOOLEAN,
    "statusPsa" JSONB,
    "urlNumber" BOOLEAN,
    "urlText" BOOLEAN,
    "userReceipt" JSONB,
    "verifiedBizName" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("pkId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_account_api_key_key" ON "User"("account_api_key");

-- CreateIndex
CREATE UNIQUE INDEX "User_google_id_key" ON "User"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_affiliation_code_key" ON "User"("affiliation_code");

-- CreateIndex
CREATE UNIQUE INDEX "User_refresh_token_key" ON "User"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerService_id_key" ON "CustomerService"("id");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerService_username_key" ON "CustomerService"("username");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerService_email_key" ON "CustomerService"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerService_refresh_token_key" ON "CustomerService"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerService_deviceId_key" ON "CustomerService"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Privilege_id_key" ON "Privilege"("id");

-- CreateIndex
CREATE UNIQUE INDEX "PrivilegeRole_id_key" ON "PrivilegeRole"("id");

-- CreateIndex
CREATE UNIQUE INDEX "PrivilegeRole_module_id_privilege_id_key" ON "PrivilegeRole"("module_id", "privilege_id");

-- CreateIndex
CREATE UNIQUE INDEX "Menu_id_key" ON "Menu"("id");

-- CreateIndex
CREATE UNIQUE INDEX "MenuPrivilege_id_key" ON "MenuPrivilege"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Module_id_key" ON "Module"("id");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_id_key" ON "SubscriptionPlan"("id");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_name_key" ON "SubscriptionPlan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_order_id_key" ON "Transaction"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "Device_id_key" ON "Device"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Device_api_key_key" ON "Device"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceLog_id_key" ON "DeviceLog"("id");

-- CreateIndex
CREATE INDEX "Session_sessionId_idx" ON "Session"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "unique_id_per_session_id_session" ON "Session"("sessionId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_id_key" ON "Contact"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Label_pkId_key" ON "Label"("pkId");

-- CreateIndex
CREATE UNIQUE INDEX "Label_slug_key" ON "Label"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceLabel_pkId_key" ON "DeviceLabel"("pkId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceLabel_deviceId_labelId_key" ON "DeviceLabel"("deviceId", "labelId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactLabel_id_key" ON "ContactLabel"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ContactLabel_contactId_labelId_key" ON "ContactLabel"("contactId", "labelId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactGroup_id_key" ON "ContactGroup"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ContactGroup_contactId_groupId_key" ON "ContactGroup"("contactId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactDevice_id_key" ON "ContactDevice"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ContactDevice_contactId_deviceId_key" ON "ContactDevice"("contactId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_id_key" ON "Group"("id");

-- CreateIndex
CREATE UNIQUE INDEX "OutgoingMessage_id_key" ON "OutgoingMessage"("id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_outgoing_message_key_per_session_id" ON "OutgoingMessage"("sessionId", "to", "id");

-- CreateIndex
CREATE UNIQUE INDEX "IncomingMessage_id_key" ON "IncomingMessage"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Broadcast_id_key" ON "Broadcast"("id");

-- CreateIndex
CREATE UNIQUE INDEX "AutoReply_id_key" ON "AutoReply"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_id_key" ON "Campaign"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_registration_syntax_key" ON "Campaign"("registration_syntax");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_unregistration_syntax_key" ON "Campaign"("unregistration_syntax");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMessage_id_key" ON "CampaignMessage"("id");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessHour_id_key" ON "BusinessHour"("id");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessHour_deviceId_key" ON "BusinessHour"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_id_key" ON "Order"("id");

-- CreateIndex
CREATE UNIQUE INDEX "OrderMessage_id_key" ON "OrderMessage"("id");

-- CreateIndex
CREATE UNIQUE INDEX "OrderMessage_csId_key" ON "OrderMessage"("csId");

-- CreateIndex
CREATE UNIQUE INDEX "Template_id_key" ON "Template"("id");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_id_key" ON "PasswordReset"("id");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_email_key" ON "PasswordReset"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX "Message_sessionId_idx" ON "Message"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "unique_message_key_per_session_id" ON "Message"("sessionId", "remoteJid", "id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_privilege_id_fkey" FOREIGN KEY ("privilege_id") REFERENCES "Privilege"("pkId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerService" ADD CONSTRAINT "CustomerService_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerService" ADD CONSTRAINT "CustomerService_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("pkId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerService" ADD CONSTRAINT "CustomerService_privilege_id_fkey" FOREIGN KEY ("privilege_id") REFERENCES "Privilege"("pkId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivilegeRole" ADD CONSTRAINT "PrivilegeRole_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "Module"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivilegeRole" ADD CONSTRAINT "PrivilegeRole_privilege_id_fkey" FOREIGN KEY ("privilege_id") REFERENCES "Privilege"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuPrivilege" ADD CONSTRAINT "MenuPrivilege_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "Menu"("pkId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuPrivilege" ADD CONSTRAINT "MenuPrivilege_privilege_id_fkey" FOREIGN KEY ("privilege_id") REFERENCES "Privilege"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceLog" ADD CONSTRAINT "DeviceLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceLabel" ADD CONSTRAINT "DeviceLabel_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceLabel" ADD CONSTRAINT "DeviceLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactLabel" ADD CONSTRAINT "ContactLabel_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactLabel" ADD CONSTRAINT "ContactLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGroup" ADD CONSTRAINT "ContactGroup_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGroup" ADD CONSTRAINT "ContactGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactDevice" ADD CONSTRAINT "ContactDevice_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactDevice" ADD CONSTRAINT "ContactDevice_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutgoingMessage" ADD CONSTRAINT "OutgoingMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingMessage" ADD CONSTRAINT "IncomingMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoReply" ADD CONSTRAINT "AutoReply_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMessage" ADD CONSTRAINT "CampaignMessage_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessHour" ADD CONSTRAINT "BusinessHour_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_csId_fkey" FOREIGN KEY ("csId") REFERENCES "CustomerService"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderMessage" ADD CONSTRAINT "OrderMessage_csId_fkey" FOREIGN KEY ("csId") REFERENCES "CustomerService"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("pkId") ON DELETE CASCADE ON UPDATE CASCADE;

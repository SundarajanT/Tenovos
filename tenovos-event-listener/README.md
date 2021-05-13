# **tenovos-event-listener**

- **RAM**: [DEFAULT]
- **TIMEOUT**: `75 Second`
- **ROLE**: `tnvs-integ-s3-db-sqs-sns-lambda`
- **REQUIRES**: `None`

---

### Environment

| NAME | Description |
| ----------- | ----------- |
| TNVS_ACCESS_KEY_ID | Tenovos Access Key |
| TNVS_SECRET_ACCESS_KEY | Tenovos Secret Key |
| integSqsUrl_CUSTOMER-ID | XXXXXX |
| integSqsUrl_CUSTOMER-ID_action | XXXXXX |
| integSqsUrl_CUSTOMER-ID_sku_publisher | XXXXXX |

---

### Process

1. Read all Env values from request body, otherwise defer to Env
2. Auto Subscribe to SNS
3. Process single objectId
4. Enrich metadata (i.e. set metadataDocument)
5. Pushes to SQS
    - For action = `action` .. post to `integSqsUrl_CUSTOMER-ID_action`
    - For action = `attachFile` or `update`
        - Customer is `CTC` and has SKU Entry table, post to `integSqsUrl_CUSTOMER-ID_skuPublisher`
        - Customer is `Pantry` and has Request Status or Assigned To, post to `integSqsUrl_${customerId}_${action}`
        - Otherwise post to `integSqsUrl_CUSTOMER-ID`
    - Otherwise post to `integSqsUrl_CUSTOMER-ID`

---

### Post Deployment

Performed Manually .. only for the initial stack deployment

1. Create CloudFront distribution
   - Copy/Paste the API Gateway: `Origin Domain Name = ????????.execute-api.us-east-1.amazonaws.com` ... i.e. without context
   - Copy/Paste the API Gateway: Remove the Context from the `Origin Path` .. so e.g. `Origin Path = /Prod`
   - Allowed HTTP Methods: Select `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`
   - Cache and origin request settings: `Use legacy cache settings`
   - Maximum TTL: 0
   - Default TTL: 0
   - Forward Cookies: All
   - Query String Forwarding and Caching: Forward all, cache based on whitelist
   - Query String Whitelist: *

2. Create a API Key
3. Assign Usage Plan



## CloudWatch Log cleanup
1. Set the retention period to 1 day
2. Deploy the following stack
```
git clone https://github.com/binxio/aws-cloudwatch-log-minder.git

cd aws-cloudwatch-log-minder

aws cloudformation create-stack \
--capabilities CAPABILITY_IAM \
--stack-name aws-cloudwatch-log-minder \
--template-body file://./cloudformation/aws-cloudwatch-log-minder.yaml \
--profile integ-???

aws cloudformation wait stack-create-complete  --stack-name aws-cloudwatch-log-minder --profile integ-???
```

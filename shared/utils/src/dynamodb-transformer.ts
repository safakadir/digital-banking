/**
 * DynamoDB attribute value transformer
 * Converts DynamoDB AttributeValue format to plain JavaScript objects
 */

type DynamoDBAttributeValue = {
  S?: string;
  N?: string;
  B?: Buffer;
  SS?: string[];
  NS?: string[];
  BS?: Buffer[];
  M?: { [key: string]: DynamoDBAttributeValue };
  L?: DynamoDBAttributeValue[];
  NULL?: boolean;
  BOOL?: boolean;
};

/**
 * Transforms a DynamoDB AttributeValue to a plain JavaScript value
 * @param attributeValue - DynamoDB AttributeValue object
 * @returns Plain JavaScript value
 */
export function transformDynamoDBAttributeValue(attributeValue: DynamoDBAttributeValue): any {
  if (attributeValue.S !== undefined) {
    return attributeValue.S;
  }
  
  if (attributeValue.N !== undefined) {
    return Number(attributeValue.N);
  }
  
  if (attributeValue.BOOL !== undefined) {
    return attributeValue.BOOL;
  }
  
  if (attributeValue.NULL !== undefined) {
    return null;
  }
  
  if (attributeValue.SS !== undefined) {
    return attributeValue.SS;
  }
  
  if (attributeValue.NS !== undefined) {
    return attributeValue.NS.map(n => Number(n));
  }
  
  if (attributeValue.BS !== undefined) {
    return attributeValue.BS;
  }
  
  if (attributeValue.L !== undefined) {
    return attributeValue.L.map(item => transformDynamoDBAttributeValue(item));
  }
  
  if (attributeValue.M !== undefined) {
    return transformDynamoDBItem(attributeValue.M);
  }
  
  // If none of the above, return the original value
  return attributeValue;
}

/**
 * Transforms a DynamoDB item (map of AttributeValues) to a plain JavaScript object
 * @param item - DynamoDB item object
 * @returns Plain JavaScript object
 */
export function transformDynamoDBItem(item: { [key: string]: DynamoDBAttributeValue }): any {
  const result: any = {};
  
  for (const [key, value] of Object.entries(item)) {
    result[key] = transformDynamoDBAttributeValue(value);
  }
  
  return result;
}

/**
 * Transforms event data from DynamoDB format to plain format
 * Handles the specific case where eventData comes from DynamoDB streams/events
 * @param eventData - Event data in DynamoDB format
 * @returns Plain JavaScript object
 */
export function transformEventData(eventData: { [key: string]: DynamoDBAttributeValue }): any {
  return transformDynamoDBItem(eventData);
}

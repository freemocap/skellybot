import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Identifier } from '../../users/sub-schema/identifiersSchema';

@Schema()
export class ContextIdentifier extends Identifier {
  @Prop()
  parent?: ContextIdentifier;

  @Prop()
  contextInstructions?: string;
}

export const ContextIdentifierSchema =
  SchemaFactory.createForClass(ContextIdentifier);

@Schema()
export class ContextRoute {
  @Prop({ required: true })
  interfaceSource: string;

  @Prop({ type: [ContextIdentifierSchema] })
  route: ContextIdentifier[];
}

export const ContextRouteSchema = SchemaFactory.createForClass(ContextRoute);

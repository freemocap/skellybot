import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Identifier } from '../../users/sub-schema/identifiersSchema';
import { Types } from 'mongoose';

@Schema()
export class ContextIdentifier extends Identifier {
  @Prop({ type: Types.ObjectId, ref: 'ContextIdentifier' })
  parentIdentifier?: ContextIdentifier;

  @Prop()
  contextInstructions?: string;
}

export const ContextIdentifierSchema =
  SchemaFactory.createForClass(ContextIdentifier);

@Schema()
export class ContextRoute {
  @Prop({ required: true })
  sourceInterface: string;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'ContextIdentifier' }],
    validate: {
      validator: function (contextIdentifiers) {
        for (let index = 1; index < contextIdentifiers.length; index++) {
          const currentIdentifier = contextIdentifiers[index];
          const previousIdentifier = contextIdentifiers[index - 1];

          if (
            !currentIdentifier.parentIdentifier ||
            !currentIdentifier.parentIdentifier.equals(previousIdentifier._id)
          ) {
            return false;
          }
        }
        return true;
      },
      message: () => 'Invalid parent-child relationship in route',
    },
  })
  contextIdentifierRoute: ContextIdentifier[];
}

export const ContextRouteSchema = SchemaFactory.createForClass(ContextRoute);
